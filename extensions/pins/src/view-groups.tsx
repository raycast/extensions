import { useState } from "react";
import {
  Icon,
  Form,
  List,
  useNavigation,
  Action,
  ActionPanel,
  showToast,
  confirmAlert,
  clearSearchBar,
} from "@raycast/api";
import { iconMap, setStorage, getStorage, useGroups } from "./utils";
import { StorageKey } from "./constants";
import { Pin, Group } from "./types";

const modifyGroup = async (
  group: Group,
  name: string,
  icon: string,
  pop: () => void,
  setGroups: (groups: Group[]) => void
) => {
  const storedGroups = await getStorage(StorageKey.LOCAL_GROUPS);

  const newGroups = storedGroups.map((oldGroup: Group) => {
    if (oldGroup.id == group.id) {
      return {
        name: name,
        icon: icon,
        id: group.id,
      };
    } else {
      return oldGroup;
    }
  });

  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  const newPins = storedPins.map((pin: Pin) => {
    if (pin.group == group.name) {
      return {
        name: pin.name,
        url: pin.url,
        icon: pin.icon,
        group: name,
        id: pin.id,
      };
    } else {
      return pin;
    }
  });

  setGroups(newGroups);
  await setStorage(StorageKey.LOCAL_GROUPS, newGroups);
  await setStorage(StorageKey.LOCAL_PINS, newPins);
  await showToast({ title: `Updated pin group!` });
  pop();
};

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
            <Form.Dropdown.Item key={icon} title={icon} value={icon} icon={icon in iconMap ? iconMap[icon] : ""} />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
};

const deleteGroup = async (group: Group, setGroups: (groups: Group[]) => void) => {
  if (await confirmAlert({ title: "Are you sure?" })) {
    const storedGroups = await getStorage(StorageKey.LOCAL_GROUPS);

    const filteredGroups = storedGroups.filter((oldGroup: Group) => {
      return oldGroup.id != group.id;
    });

    const isDuplicate =
      filteredGroups.filter((oldGroup: Group) => {
        return oldGroup.name == group.name;
      }).length != 0;

    const storedPins = await getStorage(StorageKey.LOCAL_PINS);
    const updatedPins = storedPins.map((pin: Pin) => {
      if (pin.group == group.name && !isDuplicate) {
        return {
          name: pin.name,
          url: pin.url,
          icon: pin.icon,
          group: "None",
          id: pin.id,
        };
      } else {
        return pin;
      }
    });

    setGroups(filteredGroups);
    await setStorage(StorageKey.LOCAL_GROUPS, filteredGroups);
    await setStorage(StorageKey.LOCAL_PINS, updatedPins);
    await showToast({ title: `Removed pin group!` });
  }
};

export default function Command() {
  const [groups, setGroups] = useGroups();
  const { push } = useNavigation();

  const iconList = Object.keys(Icon);
  iconList.unshift("None");

  return (
    <List isLoading={groups === undefined} searchBarPlaceholder="Search groups...">
      <List.EmptyView title="No Groups Found" icon="no-view.png" />
      {((groups as Group[]) || []).map((group) => (
        <List.Item
          title={group.name}
          key={group.id}
          icon={group.icon in iconMap ? iconMap[group.icon] : ""}
          actions={
            <ActionPanel>
              <Action
                title="Edit"
                icon={Icon.Pencil}
                onAction={() =>
                  push(<EditGroupView group={group} setGroups={setGroups as (groups: Group[]) => void} />)
                }
              />
              <Action
                title="Delete Group"
                icon={Icon.Trash}
                onAction={() => {
                  deleteGroup(group, setGroups as (groups: Group[]) => void);
                  clearSearchBar();
                }}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
