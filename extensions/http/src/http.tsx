import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  Clipboard,
  showHUD
} from "@raycast/api";
import { NewResponse, Profile, Request, ShowDetails, StateProfiles, StateRequests } from "./types";
import { useCallback, useEffect } from "react";
import { CreateItemAction, RequestDetails } from "./components";
import { buildRequestURL, runRequest } from "./run";
import { useCachedState } from "@raycast/utils";
import ItemForm from "./components/ItemForm";
import ActionStyle = Alert.ActionStyle;

export default function Command() {
  const [stateItems, setStateItems] = useCachedState<StateRequests>("items", {
    isLoading: true,
    isRequesting: false,
    items: [],
    ShowDetails: ShowDetails.Full
  });

  const [stateProfiles, setStateProfiles] = useCachedState<StateProfiles>("profiles", {
    isLoading: true,
    items: []
  });

  // let currentProfile: Profile | undefined;

  useEffect(() => {
    (async () => {
      const storedProfiles = await LocalStorage.getItem<string>("profiles");

      if (!storedProfiles) {
        setStateProfiles((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const items: Profile[] = JSON.parse(storedProfiles);
        setStateProfiles((previous) => ({ ...previous, items, isLoading: false }));
      } catch (e) {
        await showToast(Toast.Style.Failure, "Error", "Can't decode profiles data");
        console.error(e);
        setStateProfiles((previous) => ({ ...previous, items: [], fields: [], isLoading: false }));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const storedItems = await LocalStorage.getItem<string>("items");

      if (!storedItems) {
        setStateItems((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const items: Request[] = JSON.parse(storedItems);
        setStateItems((previous) => ({ ...previous, items, isLoading: false }));
      } catch (e) {
        await showToast(Toast.Style.Failure, "Error", "Can't decode items");
        console.error(e);
        setStateItems((previous) => ({ ...previous, items: [], isLoading: false }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("items", JSON.stringify(stateItems.items));
  }, [stateItems.items]);

  const handleCreate = useCallback(
    (item: Request) => {
      const newItems = [...stateItems.items, item];
      setStateItems((previous) => ({ ...previous, items: newItems }));
    },
    [stateItems.items, setStateItems]
  );

  const handleUpdate = useCallback(
    (item: Request, index: number) => {
      const newItems = [...stateItems.items];
      newItems[index] = item;
      setStateItems((previous) => ({ ...previous, items: newItems }));
    },
    [stateItems.items, setStateItems]
  );

  const handleToggleDetails = useCallback(() => {
    switch (stateItems.ShowDetails) {
      case ShowDetails.None:
        stateItems.ShowDetails = ShowDetails.Full;
        break;
      case ShowDetails.Full:
        stateItems.ShowDetails = ShowDetails.Short;
        break;
      default:
        stateItems.ShowDetails = ShowDetails.None;
        break;
    }

    setStateItems((previous) => ({ ...previous, ShowDetails: stateItems.ShowDetails }));
  }, [stateItems.items, setStateItems]);

  const handleMoveUp = useCallback(
    (index: number) => {
      if (stateItems.items.length <= 1 || index === 0) {
        return;
      }
      const newItems = [...stateItems.items];
      const item = newItems[index];
      newItems[index] = newItems[index - 1];
      newItems[index - 1] = item;
      setStateItems((previous) => ({ ...previous, items: newItems }));
    },
    [stateItems.items, setStateItems]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (stateItems.items.length <= 1 || index === stateItems.items.length - 1) {
        return;
      }
      const newItems = [...stateItems.items];
      const item = newItems[index];
      newItems[index] = newItems[index + 1];
      newItems[index + 1] = item;
      setStateItems((previous) => ({ ...previous, items: newItems }));
    },
    [stateItems.items, setStateItems]
  );

  const copyURL = useCallback(async () => {
    const profileContent = await LocalStorage.getItem("currentProfile");
    const profile: Profile = JSON.parse(profileContent?.toString() || "{}");
    const url = buildRequestURL(stateItems.items[0].URL, profile);
    await Clipboard.copy(url);
    await showHUD("URL copied to clipboard");
  }, [stateItems.items, stateProfiles.items]);

  const handleDelete = useCallback(
    async (index: number, name: string) => {
      return confirmAlert({
        title: "Are you sure?",
        message: `Delete request "${name}"`,
        dismissAction: {
          title: "Cancel"
        },
        primaryAction: {
          title: "Delete",
          style: ActionStyle.Destructive,
          onAction: () => {
            const newItems = [...stateItems.items];
            newItems.splice(index, 1);
            setStateItems((previous) => ({ ...previous, items: newItems }));
          }
        }
      });
    },
    [stateItems.items, setStateItems]
  );

  const handleRun = useCallback(
    async (item: Request, index: number) => {
      const newItems = [...stateItems.items];
      item.LastResponse = NewResponse();
      newItems[index] = item;
      setStateItems((previous) => ({ ...previous, items: newItems, isLoading: true }));

      item.LastResponse = await runRequest(item);

      newItems[index] = item;
      setStateItems((previous) => ({ ...previous, items: newItems, isLoading: false }));
    },
    [stateItems.items, setStateItems]
  );

  return (
    <List
      isLoading={stateItems.isLoading}
      isShowingDetail={stateItems.items.length > 0 && stateItems.ShowDetails !== ShowDetails.None}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Profile"
          storeValue
          onChange={(value) => {
            const currentProfile = stateProfiles.items.find((item) => item.id === value);
            LocalStorage.setItem("currentProfile", JSON.stringify(currentProfile));
          }}
        >
          {stateProfiles.items.map((item, index) => (
            <List.Dropdown.Item key={index} title={item.name} value={item.id} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <CreateItemAction onCreate={handleCreate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.EmptyView
        title={"No stored requests"}
        icon={Icon.BlankDocument}
        description={"Create a new request using the Cmd+N shortcut\nUse Cmd+K to explore more actions\nUse command HTTP Profiles to create a new profile"}
      ></List.EmptyView>
      {stateItems.items.map((item, index) => (
        <List.Item
          key={item.ID}
          title={item.Name}
          subtitle={item.Method + " " + item.URL}
          detail={stateItems.ShowDetails === ShowDetails.None ? null : RequestDetails(item, stateItems.ShowDetails)}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Request">
                <Action
                  title="Run"
                  icon={Icon.Play}
                  onAction={() => handleRun(item, index)}
                />
                <Action.Push
                  icon={Icon.Pencil}
                  title="Edit"
                  target={<ItemForm item={item} index={index} onCreate={() => handleUpdate(item, index)} />}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete"
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(index, item.Name)}
                />
                <Action
                  icon={Icon.BlankDocument}
                  title="Copy Request URL"
                  shortcut={{ modifiers: ["opt"], key: "u" }}
                  onAction={() => copyURL()}
                />
                <Action.CopyToClipboard
                  title="Copy Response Body"
                  icon={Icon.BlankDocument}
                  shortcut={{ modifiers: ["opt"], key: "b" }}
                  content={item.LastResponse?.Body || ""}
                />
              </ActionPanel.Section>
              <CreateItemAction onCreate={handleCreate} />
              <Action
                title="Toggle View Mode"
                icon={Icon.Layers}
                shortcut={{ modifiers: ["opt"], key: "d" }}
                onAction={() => handleToggleDetails()}
              />
              <ActionPanel.Section title="Order">
                <Action
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                  title="Move Up"
                  onAction={() => handleMoveUp(index)}
                />
                <Action
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                  title="Move Down"
                  onAction={() => handleMoveDown(index)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
