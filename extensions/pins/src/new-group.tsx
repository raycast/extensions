import { useState } from "react";
import { Form, Icon, ActionPanel, Action, showToast, popToRoot } from "@raycast/api";
import { iconMap, setStorage, getStorage } from "./utils";
import { StorageKey } from "./constants";

const createNewGroup = async (name: string, icon: string) => {
  // Creates a new group; updates local storage
  const storedGroups = await getStorage(StorageKey.LOCAL_GROUPS);

  const newID = (await getStorage(StorageKey.NEXT_GROUP_ID))[0];
  setStorage(StorageKey.NEXT_GROUP_ID, [newID + 1]);

  const newData = [...storedGroups];
  newData.push({
    name: name,
    icon: icon,
    id: newID,
  });

  await setStorage(StorageKey.LOCAL_GROUPS, newData);
  await showToast({ title: `Added pin group "${name}"` });
  popToRoot();
};

const checkNameField = (name: string, setNameError: (error: string | undefined) => void) => {
  // Checks for non-empty (non-spaces-only) name
  if (name.trim().length == 0) {
    setNameError("Name cannot be empty!");
  } else {
    setNameError(undefined);
  }
};

const NewGroupForm = () => {
  const [nameError, setNameError] = useState<string | undefined>();

  const iconList = Object.keys(Icon);
  iconList.unshift("None");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={(values) => createNewGroup(values.nameField, values.iconField)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Group Name"
        placeholder="Enter the group name"
        error={nameError}
        onChange={(value) => checkNameField(value, setNameError)}
        onBlur={(event) => checkNameField(event.target.value as string, setNameError)}
      />

      <Form.Dropdown id="iconField" title="Group Icon" defaultValue="BulletPoints">
        {iconList.map((icon) => {
          return (
            <Form.Dropdown.Item key={icon} title={icon} value={icon} icon={icon in iconMap ? iconMap[icon] : ""} />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
};

export default function Command() {
  return <NewGroupForm />;
}
