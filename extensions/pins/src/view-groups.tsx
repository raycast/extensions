import { useState } from "react";
import { Icon, Form, List, useNavigation, Action, ActionPanel, confirmAlert, Alert } from "@raycast/api";
import { iconMap, setStorage, getStorage } from "./lib/utils";
import { StorageKey } from "./lib/constants";
import { Group, deleteGroup, modifyGroup, useGroups } from "./lib/Groups";
import { Pin, usePins } from "./lib/Pins";

/**
 * Form view for editing a group.
 * @param props.group The group to edit.
 * @param props.setGroups The function to call to update the list of groups.
 * @returns A form view.
 */
const EditGroupView = (props: { group: Group; setGroups: (groups: Group[]) => void }) => {
  const group = props.group;
  const setGroups = props.setGroups;
  const [nameError, setNameError] = useState<string | undefined>();
  const { pop } = useNavigation();

  const iconList = Object.keys(Icon);
  iconList.unshift("None");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={(values) => modifyGroup(group, values.nameField, values.iconField, pop, setGroups)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Group Name"
        placeholder="Enter the group name"
        error={nameError}
        onChange={() => (nameError !== undefined ? setNameError(undefined) : null)}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("Name cannot be empty!");
          } else if (nameError !== undefined) {
            setNameError(undefined);
          }
        }}
        defaultValue={group.name}
      />

      <Form.Dropdown id="iconField" title="Group Icon" defaultValue={group.icon}>
        {iconList.map((icon) => {
          return (
            <Form.Dropdown.Item
              key={icon}
              title={icon}
              value={icon}
              icon={icon in iconMap ? iconMap[icon] : Icon.Minus}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
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
      target={
        <EditGroupView
          group={{
            name: "",
            icon: "None",
            id: -1,
          }}
          setGroups={setGroups}
        />
      }
    />
  );
};

/**
 * Moves a group up in the list of groups.
 * @param index The current index of the group.
 * @param setGroups The function to call to update the list of groups.
 */
const moveGroupUp = async (index: number, setGroups: React.Dispatch<React.SetStateAction<Group[]>>) => {
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  if (storedGroups.length > index) {
    [storedGroups[index - 1], storedGroups[index]] = [storedGroups[index], storedGroups[index - 1]];
    setGroups(storedGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, storedGroups);
  }
};

/**
 * Moves a group down in the list of groups.
 * @param index The current index of the group.
 * @param setGroups The function to call to update the list of groups.
 */
const moveGroupDown = async (index: number, setGroups: React.Dispatch<React.SetStateAction<Group[]>>) => {
  const storedGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  if (storedGroups.length > index + 1) {
    [storedGroups[index], storedGroups[index + 1]] = [storedGroups[index + 1], storedGroups[index]];
    setGroups(storedGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, storedGroups);
  }
};

export default function Command() {
  const { groups, setGroups } = useGroups();
  const { pins } = usePins();
  const { push } = useNavigation();

  const iconList = Object.keys(Icon);
  iconList.unshift("None");

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
        return (
          <List.Item
            title={group.name}
            subtitle={`${groupPins.length} pin${groupPins.length == 1 ? "" : "s"}`}
            key={group.id}
            icon={group.icon in iconMap ? iconMap[group.icon] : Icon.Minus}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Group Actions">
                  <Action
                    title="Edit"
                    icon={Icon.Pencil}
                    onAction={() =>
                      push(<EditGroupView group={group} setGroups={setGroups as (groups: Group[]) => void} />)
                    }
                  />

                  <Action.CopyToClipboard
                    title="Copy Group Name"
                    content={group.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
                        await moveGroupUp(index, setGroups);
                      }}
                    />
                  ) : null}
                  {index < groups.length - 1 ? (
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={async () => {
                        await moveGroupDown(index, setGroups);
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
