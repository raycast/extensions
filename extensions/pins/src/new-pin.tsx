import { useState, useEffect } from "react";
import { Form, Icon, ActionPanel, Action, showToast, useNavigation } from "@raycast/api";
import { iconMap, getStorage, createNewPin } from "./utils";
import { StorageKey } from "./constants";
import { Group } from "./types";
import { getFavicon } from "@raycast/utils";

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
  const [url, setURL] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  const groups = useGetGroups();
  const iconList = Object.keys(Icon);
  iconList.unshift("Favicon / File Icon");
  iconList.unshift("None");

  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              await createNewPin(values.nameField, values.urlField, values.iconField, values.groupField);
              await showToast({ title: `Added pin for "${values.nameField}"` });
              pop();
            }}
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
        onChange={(value) => {
          setURL(value);
          if (urlError !== undefined) {
            setUrlError(undefined);
          } else {
            null;
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("URL cannot be empty!");
          } else if (
            !event.target.value?.includes(":") &&
            !event.target.value?.startsWith("/") &&
            !event.target.value?.startsWith("~")
          ) {
            setUrlError("Please enter a valid URL or path!");
          } else if (urlError !== undefined) {
            setUrlError(undefined);
          }
        }}
      />

      <Form.Dropdown id="iconField" title="Pin Icon" defaultValue="None">
        {iconList.map((icon) => {
          const urlIcon = url
            ? url.startsWith("/") || url.startsWith("~")
              ? { fileIcon: url }
              : getFavicon(url)
            : iconMap["Minus"];

          return (
            <Form.Dropdown.Item
              key={icon}
              title={icon}
              value={icon}
              icon={icon in iconMap ? iconMap[icon] : icon == "Favicon / File Icon" ? urlIcon : iconMap["Minus"]}
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
