import { useEffect, useState } from "react";
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
  getPreferenceValues,
} from "@raycast/api";
import { iconMap, setStorage, getStorage, usePins, openPin } from "./utils";
import { StorageKey } from "./constants";
import { Pin, Group, ExtensionPreferences } from "./types";
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

const modifyPin = async (
  pin: Pin,
  name: string,
  url: string,
  icon: string,
  group: string,
  pop: () => void,
  setPins: React.Dispatch<React.SetStateAction<Pin[] | undefined>>
) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);

  const newData: Pin[] = storedPins.map((oldPin: Pin) => {
    // Update pin if it exists
    if (oldPin.id == pin.id) {
      return {
        name: name,
        url: url,
        icon: icon,
        group: group,
        id: pin.id,
      };
    } else {
      return oldPin;
    }
  });

  if (newData.every((storedPin) => storedPin.id != pin.id)) {
    // Add new pin if it doesn't exist
    newData.push({
      name: name,
      url: url,
      icon: icon,
      group: group,
      id: pin.id,
    });
  }

  setPins(newData);
  await setStorage(StorageKey.LOCAL_PINS, newData);
  await showToast({ title: `Updated pin!` });
  pop();
};

const EditPinView = (props: { pin: Pin; setPins: React.Dispatch<React.SetStateAction<Pin[] | undefined>> }) => {
  const pin = props.pin;
  const setPins = props.setPins;
  const [url, setURL] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const groups = useGetGroups();
  const { pop } = useNavigation();

  const iconList = Object.keys(Icon);
  iconList.unshift("Favicon / File Icon");
  iconList.unshift("None");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) =>
              modifyPin(pin, values.nameField, values.urlField, values.iconField, values.groupField, pop, setPins)
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Pin Name"
        placeholder="Enter pin name, e.g. Google, or leave blank to use URL"
        defaultValue={pin.name}
      />

      <Form.TextField
        id="urlField"
        title="Pin URL"
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
        defaultValue={pin.url}
      />

      <Form.Dropdown id="iconField" title="Pin Icon" defaultValue={pin.icon}>
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

      {groups.length > 0 ? (
        <Form.Dropdown id="groupField" title="Pin Group" defaultValue={pin.group}>
          {groups.map((group) => {
            return (
              <Form.Dropdown.Item key={group.id} title={group.name} value={group.name} icon={iconMap[group.icon]} />
            );
          })}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
};

const deletePin = async (pin: Pin, setPins: React.Dispatch<React.SetStateAction<Pin[] | undefined>>) => {
  if (await confirmAlert({ title: "Are you sure?" })) {
    const storedPins = await getStorage(StorageKey.LOCAL_PINS);

    const filteredPins = storedPins.filter((oldPin: Pin) => {
      return oldPin.id != pin.id;
    });

    setPins(filteredPins);
    await setStorage(StorageKey.LOCAL_PINS, filteredPins);
    await showToast({ title: `Removed pin!` });
  }
};

const movePinUp = async (index: number, setPins: React.Dispatch<React.SetStateAction<Pin[] | undefined>>) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  if (storedPins.length > index) {
    [storedPins[index - 1], storedPins[index]] = [storedPins[index], storedPins[index - 1]];
    setPins(storedPins);
    await setStorage(StorageKey.LOCAL_PINS, storedPins);
  }
};

const movePinDown = async (index: number, setPins: React.Dispatch<React.SetStateAction<Pin[] | undefined>>) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  if (storedPins.length > index + 1) {
    [storedPins[index], storedPins[index + 1]] = [storedPins[index + 1], storedPins[index]];
    setPins(storedPins);
    await setStorage(StorageKey.LOCAL_PINS, storedPins);
  }
};

const CreateNewPinAction = (props: { setPins: React.Dispatch<React.SetStateAction<Pin[] | undefined>> }) => {
  const { setPins } = props;
  return (
    <Action.Push
      title="Create New Pin"
      icon={Icon.PlusCircle}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={
        <EditPinView
          pin={{
            name: "",
            url: "",
            icon: "None",
            group: "None",
            id: -1,
          }}
          setPins={setPins}
        />
      }
    />
  );
};

export default function Command() {
  const { pins, setPins } = usePins();
  const preferences = getPreferenceValues<ExtensionPreferences>();

  return (
    <List
      isLoading={pins === undefined}
      searchBarPlaceholder="Search pins..."
      actions={<ActionPanel>{<CreateNewPinAction setPins={setPins} />}</ActionPanel>}
    >
      <List.EmptyView title="No Pins Found" icon="no-view.png" />
      {pins &&
        (pins as Pin[]).map((pin, index) => (
          <List.Item
            title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
            subtitle={pin.group != "None" ? pin.group : ""}
            key={pin.id}
            icon={
              pin.icon in iconMap
                ? iconMap[pin.icon]
                : pin.icon == "None"
                ? ""
                : pin.url.startsWith("/") || pin.url.startsWith("~")
                ? { fileIcon: pin.url }
                : getFavicon(pin.url)
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Pin Actions">
                  <Action title="Open" icon={Icon.ChevronRight} onAction={() => openPin(pin, preferences)} />
                  <Action.Push
                    title="Edit"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<EditPinView pin={pin} setPins={setPins} />}
                  />
                  <Action.Push
                    title="Duplicate"
                    icon={Icon.EyeDropper}
                    shortcut={{ modifiers: ["cmd", "ctrl"], key: "d" }}
                    target={<EditPinView pin={{ ...pin, name: pin.name + " Copy" }} setPins={setPins} />}
                  />

                  {index > 0 ? (
                    <Action
                      title="Move Up"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                      onAction={() => {
                        movePinUp(index, setPins);
                        clearSearchBar();
                      }}
                    />
                  ) : null}
                  {index < pins.length - 1 ? (
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={() => {
                        movePinDown(index, setPins);
                        clearSearchBar();
                      }}
                    />
                  ) : null}

                  <Action
                    title="Delete Pin"
                    icon={Icon.Trash}
                    onAction={() => {
                      deletePin(pin, setPins);
                      clearSearchBar();
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel.Section>
                <CreateNewPinAction setPins={setPins} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
