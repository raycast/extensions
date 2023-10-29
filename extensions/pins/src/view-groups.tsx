import {
  Icon,
  List,
  Action,
  ActionPanel,
  confirmAlert,
  Alert,
  getPreferenceValues,
  Clipboard,
  showHUD,
} from "@raycast/api";
import { setStorage, getStorage } from "./lib/utils";
import { Direction, StorageKey } from "./lib/constants";
import { Group, deleteGroup, useGroups } from "./lib/Groups";
import { Pin, usePins } from "./lib/Pins";
import { addIDAccessory, addParentGroupAccessory, addSortingStrategyAccessory } from "./lib/accessories";
import { getGroupIcon } from "./lib/icons";
import GroupForm from "./components/GroupForm";

/**
 * Preferences for the view groups command.
 */
type ViewGroupsPreferences = {
  /**
   * Whether to display the ID of each group as an accessory.
   */
  showIDs: boolean;

  /**
   * Whether to display the current sort strategy of each group as an accessory.
   */
  showSortStrategy: boolean;

  /**
   * Whether to display the parent group of each group as an accessory.
   */
  showParentGroup: boolean;
};

/**
 * Action to create a new group. Opens a form view with blank/default fields.
 * @param props.setGroups The function to call to update the list of groups.
 * @returns An action component.
 */
const CreateNewGroupAction = (props: { setGroups: (groups: Group[]) => void }) => {
  const { setGroups } = props;
  return (
    <Action.Push
      title="Create New Group"
      icon={Icon.PlusCircle}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<GroupForm setGroups={setGroups} />}
    />
  );
};

/**
 * Moves a group up or down in the list of groups.
 * @param index The index of the group to move.
 * @param dir The direction to move the group in. One of {@link Direction}.
 * @param setGroups The function to call to update the list of groups.
 */
const moveGroup = async (index: number, dir: Direction, setGroups: React.Dispatch<React.SetStateAction<Group[]>>) => {
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  const mod = 1 - dir;
  if (storedGroups.length > index + mod) {
    [storedGroups[index - dir], storedGroups[index + mod]] = [storedGroups[index + mod], storedGroups[index - dir]];
    setGroups(storedGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, storedGroups);
  }
};

/**
 * Raycast command to view all pin groups in a list within the Raycast window.
 */
export default function ViewGroupsCommand() {
  const { groups, setGroups } = useGroups();
  const { pins } = usePins();
  const preferences = getPreferenceValues<ViewGroupsPreferences>();

  return (
    <List
      isLoading={groups === undefined}
      searchBarPlaceholder="Search groups..."
      actions={
        <ActionPanel>
          <CreateNewGroupAction setGroups={setGroups as (groups: Group[]) => void} />
        </ActionPanel>
      }
    >
      <List.EmptyView title="No Groups Found" icon="no-view.png" />
      {((groups as Group[]) || []).map((group, index) => {
        const groupPins = pins.filter((pin: Pin) => pin.group == group.name);
        const maxID = Math.max(...groups.map((group) => group.id));
        const accessories: List.Item.Accessory[] = [];
        if (preferences.showSortStrategy) addSortingStrategyAccessory(group, accessories);
        if (preferences.showIDs) addIDAccessory(group, accessories, maxID);
        if (preferences.showParentGroup) addParentGroupAccessory(group, accessories, groups);

        return (
          <List.Item
            title={group.name}
            subtitle={`${groupPins.length} pin${groupPins.length == 1 ? "" : "s"}`}
            accessories={accessories}
            key={group.id}
            icon={getGroupIcon(group)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Group Actions">
                  <Action.Push
                    title="Edit"
                    icon={Icon.Pencil}
                    target={<GroupForm group={group} setGroups={setGroups as (groups: Group[]) => void} />}
                  />

                  <Action.CopyToClipboard
                    title="Copy Group Name"
                    content={group.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Group ID"
                    content={group.id.toString()}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  />
                  <Action
                    title="Copy Group JSON"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                    onAction={async () => {
                      const data = {
                        groups: [group],
                        pins: pins.filter((pin: Pin) => pin.group == group.name),
                      };

                      const jsonData = JSON.stringify(data);
                      await Clipboard.copy(jsonData);
                      await showHUD("Copied JSON to Clipboard");
                    }}
                  />

                  <Action
                    title="Delete Group"
                    icon={Icon.Trash}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Group (Keep Pins)",
                          message: "Are you sure?",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        await deleteGroup(group, setGroups as (groups: Group[]) => void);
                      }
                    }}
                    style={Action.Style.Destructive}
                  />
                  <Action
                    title="Delete Group And Pins"
                    icon={Icon.Trash}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Group And Pins",
                          message: "Are you sure?",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        const storedPins = await getStorage(StorageKey.LOCAL_PINS);
                        const updatedPins = storedPins.filter((pin: Pin) => {
                          return pin.group != group.name;
                        });
                        await setStorage(StorageKey.LOCAL_PINS, updatedPins);
                        await deleteGroup(group, setGroups as (groups: Group[]) => void);
                      }
                    }}
                    style={Action.Style.Destructive}
                  />

                  {index > 0 ? (
                    <Action
                      title="Move Up"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                      onAction={async () => {
                        await moveGroup(index, Direction.UP, setGroups);
                      }}
                    />
                  ) : null}
                  {index < groups.length - 1 ? (
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={async () => {
                        await moveGroup(index, Direction.DOWN, setGroups);
                      }}
                    />
                  ) : null}
                </ActionPanel.Section>
                <CreateNewGroupAction setGroups={setGroups as (groups: Group[]) => void} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
