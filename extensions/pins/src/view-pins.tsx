import { useEffect, useState } from "react";
import {
  Icon,
  open,
  Form,
  List,
  useNavigation,
  Action,
  ActionPanel,
  showToast,
  confirmAlert,
  clearSearchBar,
} from "@raycast/api";
import { iconMap, setStorage, getStorage, usePins } from "./utils";
import { StorageKey } from "./constants";
import { Pin, Group } from "./types";
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
  setPins: (pins: Pin[]) => void
) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);

  const newData = storedPins.map((oldPin: Pin) => {
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

  setPins(newData);
  await setStorage(StorageKey.LOCAL_PINS, newData);
  await showToast({ title: `Updated pin!` });
  pop();
};

const EditPinView = (props: { pin: Pin; setPins: (pins: Pin[]) => void }) => {
  const pin = props.pin;
  const setPins = props.setPins;
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
        defaultValue={pin.url}
      />

      <Form.Dropdown id="iconField" title="Pin Icon" defaultValue={pin.icon}>
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

const deletePin = async (pin: Pin, setPins: (pins: Pin[]) => void) => {
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

const movePinUp = async (index: number, setPins: (pins: Pin[]) => void) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  if (storedPins.length > index) {
    [storedPins[index - 1], storedPins[index]] = [storedPins[index], storedPins[index - 1]];
    setPins(storedPins);
    await setStorage(StorageKey.LOCAL_PINS, storedPins);
  }
};

const movePinDown = async (index: number, setPins: (pins: Pin[]) => void) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  if (storedPins.length > index + 1) {
    [storedPins[index], storedPins[index + 1]] = [storedPins[index + 1], storedPins[index]];
    setPins(storedPins);
    await setStorage(StorageKey.LOCAL_PINS, storedPins);
  }
};

export default function Command() {
  const [pins, setPins] = usePins();
  const { push } = useNavigation();

  return (
    <List isLoading={pins === undefined} searchBarPlaceholder="Search pins...">
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
                : pin.url.startsWith("/")
                ? { fileIcon: pin.url }
                : getFavicon(pin.url)
            }
            actions={
              <ActionPanel>
                <Action title="Open" icon={Icon.ChevronRight} onAction={() => open(pin.url)} />
                <Action
                  title="Edit"
                  icon={Icon.Pencil}
                  onAction={() => push(<EditPinView pin={pin} setPins={setPins as (pins: Pin[]) => void} />)}
                />

                {index > 0 ? (
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    onAction={() => {
                      movePinUp(index, setPins as (pins: Pin[]) => void);
                      clearSearchBar();
                    }}
                  />
                ) : null}
                {index < pins.length - 1 ? (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    onAction={() => {
                      movePinDown(index, setPins as (pins: Pin[]) => void);
                      clearSearchBar();
                    }}
                  />
                ) : null}

                <Action
                  title="Delete Pin"
                  icon={Icon.Trash}
                  onAction={() => {
                    deletePin(pin, setPins as (pins: Pin[]) => void);
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
