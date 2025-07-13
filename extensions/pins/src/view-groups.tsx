import {
  Icon,
  List,
  Action,
  ActionPanel,
  confirmAlert,
  Alert,
  getPreferenceValues,
  Keyboard,
  LocalStorage,
  showToast,
} from "@raycast/api";
import { setStorage, getStorage } from "./lib/storage";
import { Direction, StorageKey } from "./lib/constants";
import { Group, deleteGroup, useGroups } from "./lib/Groups";
import { Pin, openPin, usePins } from "./lib/Pins";
import {
  addIDAccessory,
  addParentGroupAccessory,
  addSortingStrategyAccessory,
  addVisibilityAccessory,
} from "./lib/accessories";
import { getGroupIcon } from "./lib/icons";
import GroupForm from "./components/GroupForm";
import { InstallExamplesAction } from "./components/actions/InstallExamplesAction";
import { useEffect, useState } from "react";
import CopyGroupActionsSubmenu from "./components/actions/CopyGroupActionsSubmenu";
import { ExtensionPreferences, ViewGroupsPreferences } from "./lib/preferences";
import { pluralize } from "./lib/utils";

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
      shortcut={Keyboard.Shortcut.Common.New}
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
  const { groups, setGroups, revalidateGroups } = useGroups();
  const { pins } = usePins();
  const [examplesInstalled, setExamplesInstalled] = useState<boolean>(true);
  const preferences = getPreferenceValues<ExtensionPreferences & ViewGroupsPreferences>();

  useEffect(() => {
    Promise.resolve(LocalStorage.getItem(StorageKey.EXAMPLE_GROUPS_INSTALLED)).then((examplesInstalled) => {
      setExamplesInstalled(examplesInstalled === 1);
    });
  }, []);

  return (
    <List
      isLoading={groups === undefined}
      searchBarPlaceholder="Search groups..."
      actions={
        <ActionPanel>
          <CreateNewGroupAction setGroups={setGroups as (groups: Group[]) => void} />
          {!examplesInstalled || groups.length == 0 ? (
            <InstallExamplesAction
              setExamplesInstalled={setExamplesInstalled}
              revalidateGroups={revalidateGroups}
              kind="groups"
            />
          ) : null}
        </ActionPanel>
      }
    >
      <List.EmptyView title="No Groups Found" icon="no-view.png" />
      {((groups as Group[]) || []).map((group, index) => {
        const groupPins = pins.filter((pin: Pin) => pin.group == group.name);
        const maxID = Math.max(...groups.map((group) => group.id));
        const accessories: List.Item.Accessory[] = [];
        if (preferences.showVisibility) addVisibilityAccessory(group, accessories, true);
        if (preferences.showSortStrategy) addSortingStrategyAccessory(group, accessories);
        if (preferences.showIDs) addIDAccessory(group, accessories, maxID);
        if (preferences.showParentGroup) addParentGroupAccessory(group, accessories, groups);

        return (
          <List.Item
            title={group.name}
            subtitle={`${groupPins.length} ${pluralize("Pin", groupPins.length)}`}
            accessories={accessories}
            key={group.id}
            icon={getGroupIcon(group)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Group Actions">
                  <Action
                    title={`Open ${groupPins.length} ${pluralize("Pin", groupPins.length)}`}
                    icon={Icon.ChevronRight}
                    onAction={async () => {
                      await Promise.all(
                        groupPins.map(async (pin) => {
                          await openPin(pin, preferences);
                        }),
                      );
                    }}
                  />
                  <Action.Push
                    title="Edit"
                    icon={Icon.Pencil}
                    target={<GroupForm group={group} setGroups={setGroups as (groups: Group[]) => void} />}
                    shortcut={Keyboard.Shortcut.Common.Edit}
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
                    shortcut={Keyboard.Shortcut.Common.Remove}
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
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  />
                  <Action
                    title="Delete All Groups (Keep Pins)"
                    icon={Icon.Trash}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Group And Pins",
                          message: "Are you sure?",
                          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        const storedGroups = await getStorage(StorageKey.LOCAL_GROUPS);
                        for (const group of storedGroups) {
                          await deleteGroup(group, setGroups as (groups: Group[]) => void, false);
                        }
                        await showToast({ title: "Deleted All Groups" });
                      }
                    }}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  />

                  {index > 0 ? (
                    <Action
                      title="Move Up"
                      icon={Icon.ArrowUp}
                      shortcut={Keyboard.Shortcut.Common.MoveUp}
                      onAction={async () => {
                        await moveGroup(index, Direction.UP, setGroups);
                      }}
                    />
                  ) : null}
                  {index < groups.length - 1 ? (
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={Keyboard.Shortcut.Common.MoveDown}
                      onAction={async () => {
                        await moveGroup(index, Direction.DOWN, setGroups);
                      }}
                    />
                  ) : null}
                </ActionPanel.Section>
                <CreateNewGroupAction setGroups={setGroups as (groups: Group[]) => void} />
                <Action.Push
                  title="Create Subgroup"
                  icon={Icon.Layers}
                  target={
                    <GroupForm
                      group={{
                        name: "",
                        icon: group.icon,
                        iconColor: group.iconColor,
                        parent: group.id,
                        sortStrategy: group.sortStrategy,
                        id: -1,
                      }}
                      setGroups={setGroups as (groups: Group[]) => void}
                    />
                  }
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                />
                {!examplesInstalled ? (
                  <InstallExamplesAction
                    setExamplesInstalled={setExamplesInstalled}
                    revalidateGroups={revalidateGroups}
                    kind="groups"
                  />
                ) : null}
                <CopyGroupActionsSubmenu group={group} groups={groups} pins={pins} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
