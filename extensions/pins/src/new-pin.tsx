import { useState, useEffect } from "react";
import { Form, Icon, ActionPanel, Action, showToast, popToRoot } from "@raycast/api";
import { iconMap, setStorage, getStorage } from "./utils";
import { StorageKey } from "./constants";
import { Group } from "./types";

const createNewPin = async (name: string, url: string, icon: string, group: string) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);

  const newID = (await getStorage(StorageKey.NEXT_PIN_ID))[0];
  setStorage(StorageKey.NEXT_PIN_ID, [newID + 1]);

  const newData = [...storedPins];
  newData.push({
    name: name,
    url: url,
    icon: icon,
    group: group,
    id: newID,
  });

  await setStorage(StorageKey.LOCAL_PINS, newData);
  await showToast({ title: `Added pin for "${name}"` });
  popToRoot();
};

const useGetGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    Promise.resolve(getStorage(StorageKey.LOCAL_GROUPS)).then((groups) => {
      const allGroups = [...groups];
      allGroups.push({
        name: "None",
        id: -1,
        icon: "Minus",
      });
      setGroups(allGroups);
    });
  }, []);

  return groups;
};

const NewPinForm = () => {
  const [urlError, setUrlError] = useState<string | undefined>();

  const groups = useGetGroups();
  const iconList = Object.keys(Icon);
  iconList.unshift("Favicon / File Icon");
  iconList.unshift("None");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={(values) => createNewPin(values.nameField, values.urlField, values.iconField, values.groupField)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Pin Name"
        placeholder="Enter pin name, e.g. Google, or leave blank to use URL"
      />

      <Form.TextField
        id="urlField"
        title="Pin Path/URL"
        placeholder="Enter the filepath or URL to pin"
        error={urlError}
        onChange={() => (urlError !== undefined ? setUrlError(undefined) : null)}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("URL cannot be empty!");
          } else if (!event.target.value?.includes(":") && !event.target.value?.startsWith("/")) {
            setUrlError("Please enter a valid URL or path!");
          } else if (urlError !== undefined) {
            setUrlError(undefined);
          }
        }}
      />

      <Form.Dropdown id="iconField" title="Pin Icon" defaultValue="None">
        {iconList.map((icon) => {
          return (
            <Form.Dropdown.Item
              key={icon}
              title={icon}
              value={icon}
              icon={icon in iconMap ? iconMap[icon] : iconMap["Minus"]}
            />
          );
        })}
      </Form.Dropdown>

      {groups?.length ? (
        <Form.Dropdown id="groupField" title="Pin Group" defaultValue="None">
          {groups.map((group) => {
            return (
              <Form.Dropdown.Item key={group.name} title={group.name} value={group.name} icon={iconMap[group.icon]} />
            );
          })}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
};

export default function Command() {
  return <NewPinForm />;
}
