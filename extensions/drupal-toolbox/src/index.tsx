import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { Action, ActionPanel, confirmAlert, Icon, List, LocalStorage, showHUD } from "@raycast/api";
import ToolList from "./components/ToolList";
import AddDrupalWebsiteAction from "./components/AddDrupalWebsiteAction";
import DeleteDrupalWebsiteAction from "./components/DeleteDrupalWebsiteAction";
import EmptyView from "./components/EmptyView";
import { DevelopmentTool, DrupalWebsite, Filter } from "./interface";

type State = {
  filter: Filter;
  isLoading: boolean;
  searchText: string;
  drupalWebsites: DrupalWebsite[];
  visibleDrupalWebsites: DrupalWebsite[];
};

export default function Command() {
  const [state, setState] = useState<State>({
    filter: Filter.All,
    isLoading: true,
    searchText: "",
    drupalWebsites: [],
    visibleDrupalWebsites: [],
  });

  useEffect(() => {
    (async () => {
      const storedDrupalWebsites = await LocalStorage.getItem<string>("drupal_websites");

      if (!storedDrupalWebsites) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const drupalWebsites: DrupalWebsite[] = JSON.parse(storedDrupalWebsites);
        setState((previous) => ({ ...previous, drupalWebsites: drupalWebsites, isLoading: false }));
      } catch (e) {
        setState((previous) => ({ ...previous, drupalWebsites: [], isLoading: false }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("drupal_websites", JSON.stringify(state.drupalWebsites));
  }, [state.drupalWebsites]);

  const handleCreate = useCallback(
    async (title: string, version: string, root: string, tool: DevelopmentTool) => {
      const newDrupalWebsites = [
        ...state.drupalWebsites,
        { id: nanoid(), title, version: version, root: root, tool: tool, weight: Date.now() },
      ];
      setState((previous) => ({
        ...previous,
        drupalWebsites: newDrupalWebsites,
        filter: Filter.All,
        searchText: "",
        weight: Date.now(),
      }));
    },
    [state.drupalWebsites, setState],
  );

  const handleWeight = (drupalWebsite: DrupalWebsite) => {
    state.drupalWebsites[state.drupalWebsites.findIndex((e) => e.id == drupalWebsite.id)].weight = Date.now();
    setState((previous) => ({ ...previous, ...{ drupalWebsites: state.drupalWebsites } }));
    LocalStorage.setItem("drupal_websites", JSON.stringify(state.drupalWebsites));
  };

  const handleDelete = useCallback(
    async (index: number) => {
      if (await confirmAlert({ title: "Are you sure?" })) {
        const newDrupalWebsites = [...state.drupalWebsites];
        newDrupalWebsites.splice(index, 1);
        setState((previous) => ({ ...previous, drupalWebsites: newDrupalWebsites }));
        await showHUD("Drupal Website record deleted.");
      }
    },
    [state.drupalWebsites, setState],
  );

  const filterDrupalWebsites = useCallback(() => {
    if (state.filter === Filter.All) {
      return state.drupalWebsites;
    }

    return state.drupalWebsites.filter((drupalWebsite) => state.filter === drupalWebsite.version);
  }, [state.drupalWebsites, state.filter]);

  return (
    <List
      filtering={true}
      isLoading={state.isLoading}
      searchText={state.searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Drupal Version"
          value={state.filter}
          onChange={(newValue) => setState((previous) => ({ ...previous, filter: newValue as Filter }))}
        >
          <List.Dropdown.Item title="All" value={Filter.All} />
          <List.Dropdown.Item title="Drupal 10" value={Filter.Drupal10} />
          <List.Dropdown.Item title="Drupal 9" value={Filter.Drupal9} />
          <List.Dropdown.Item title="Drupal 8" value={Filter.Drupal8} />
        </List.Dropdown>
      }
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
    >
      <EmptyView
        filter={state.filter}
        drupalWebsites={filterDrupalWebsites()}
        searchText={state.searchText}
        onCreate={handleCreate}
      />
      {filterDrupalWebsites()
        .sort((d1, d2) => {
          return d2.weight - d1.weight;
        })
        .map((drupalWebsite, index) => (
          <List.Item
            key={drupalWebsite.id}
            title={drupalWebsite.title}
            icon={`logo-${drupalWebsite.version}.png`}
            subtitle={drupalWebsite.version.replace("d", "Drupal ")}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Tools"
                  icon={Icon.WrenchScrewdriver}
                  onPush={() => handleWeight(drupalWebsite)}
                  target={<ToolList drupalWebsite={drupalWebsite} />}
                ></Action.Push>
                <ActionPanel.Section>
                  <AddDrupalWebsiteAction onCreate={handleCreate} />
                  <DeleteDrupalWebsiteAction onDelete={() => handleDelete(index)} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Donate"
                    icon={Icon.Heart}
                    url="https://github.com/sponsors/emircanerkul"
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
