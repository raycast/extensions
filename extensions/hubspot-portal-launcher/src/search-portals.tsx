import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { ActionPanel, Action, Icon, List, LocalStorage, confirmAlert, Alert } from "@raycast/api";
import { Portal, PortalType, Filter } from "./types";
import { CreatePortalAction, DeletePortalAction, EmptyView, OpenPortalAction } from "./components";
import { portalTypeIcons } from "./utils";

type State = {
  filter: Filter;
  isLoading: boolean;
  searchText: string;
  portals: Portal[];
  visiblePortals: Portal[];
};

export default function Command() {
  const [state, setState] = useState<State>({
    filter: Filter.All,
    isLoading: true,
    searchText: "",
    portals: [],
    visiblePortals: [],
  });

  useEffect(() => {
    (async () => {
      const storedPortals = await LocalStorage.getItem<string>("portals");

      if (!storedPortals) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const portals: Portal[] = JSON.parse(storedPortals);
        setState((previous) => ({ ...previous, portals, isLoading: false }));
      } catch (e) {
        // can't decode portals
        setState((previous) => ({ ...previous, portals: [], isLoading: false }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("portals", JSON.stringify(state.portals));
  }, [state.portals]);

  const handleCreate = useCallback(
    (portalName: string, portalId: string, portalType: PortalType) => {
      const newPortals = [
        ...state.portals,
        { id: nanoid(), portalName: portalName, portalId: portalId, portalType: portalType },
      ];
      setState((previous) => ({ ...previous, portals: newPortals, filter: Filter.All, searchText: "" }));
    },
    [state.portals, setState]
  );

  const handleDelete = useCallback(
    async (index: number) => {
      const options: Alert.Options = {
        title: "Delete Portal",
        icon: Icon.Trash,
        message: "Are you sure you want to delete the portal?",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
          onAction: () => {
            const newPortals = [...state.portals];
            newPortals.splice(index, 1);
            setState((previous) => ({ ...previous, portals: newPortals }));
          },
        },
      };
      await confirmAlert(options);
    },
    [state.portals, setState]
  );

  const filterPortals = useCallback(() => {
    if (state.filter === Filter.All) {
      return state.portals;
    }
    if (state.filter === Filter.Prod) {
      return state.portals.filter((portal) => portal.portalType === PortalType.Prod);
    }
    if (state.filter === Filter.Sandbox) {
      return state.portals.filter((portal) => portal.portalType === PortalType.Sandbox);
    }
    if (state.filter === Filter.CMSSandbox) {
      return state.portals.filter((portal) => portal.portalType === PortalType.CMSSandbox);
    }
    if (state.filter === Filter.Dev) {
      return state.portals.filter((portal) => portal.portalType === PortalType.Dev);
    }
    if (state.filter === Filter.Test) {
      return state.portals.filter((portal) => portal.portalType === PortalType.Test);
    }
    return state.portals;
  }, [state.portals, state.filter]);

  return (
    <List
      isLoading={state.isLoading}
      searchText={state.searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Todo List"
          value={state.filter}
          onChange={(newValue) => setState((previous) => ({ ...previous, filter: newValue as Filter }))}
        >
          <List.Dropdown.Item title={Filter.All} value={Filter.All} icon={Icon.BulletPoints} />
          <List.Dropdown.Item title={Filter.Prod} value={Filter.Prod} icon={portalTypeIcons.Production} />
          <List.Dropdown.Item title={Filter.Sandbox} value={Filter.Sandbox} icon={portalTypeIcons.Sandbox} />
          <List.Dropdown.Item
            title={Filter.CMSSandbox}
            value={Filter.CMSSandbox}
            icon={portalTypeIcons["CMS Sandbox"]}
          />
          <List.Dropdown.Item title={Filter.Dev} value={Filter.Dev} icon={portalTypeIcons.Dev} />
          <List.Dropdown.Item title={Filter.Test} value={Filter.Test} icon={portalTypeIcons.Test} />
        </List.Dropdown>
      }
      enableFiltering
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
    >
      <EmptyView
        filter={state.filter}
        portals={filterPortals()}
        searchText={state.searchText}
        onCreate={handleCreate}
      />
      {filterPortals().map((portal, index) => (
        <List.Item
          key={portal.id}
          title={portal.portalName}
          subtitle={portal.portalId}
          accessories={[
            {
              icon: portalTypeIcons[portal.portalType],
              text: portal.portalType,
            },
          ]}
          actions={
            <ActionPanel>
              <OpenPortalAction portal={portal} />
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Portal ID to Clipboard"
                  content={portal.portalId}
                  icon={Icon.CopyClipboard}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CreatePortalAction onCreate={handleCreate} />
                <DeletePortalAction onDelete={() => handleDelete(index)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
