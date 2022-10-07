import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, open, openExtensionPreferences, getPreferenceValues, showToast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { setStorage, getStorage, iconMap, useGroups, copyPinData } from "./utils";
import { StorageKey } from "./constants";
import { Pin, Group } from "./types";

interface Preferences {
  showCategories: boolean;
  showOpenAll: boolean;
}

const usePinGroups = () => {
  // Get the groups to display in the menu (i.e. groups that actually contain pins)
  const [state, setState] = useState<{ pinGroups: { [index: string]: Pin[] }; isLoading: boolean }>({
    pinGroups: {},
    isLoading: true,
  });

  useEffect(() => {
    Promise.resolve(getStorage(StorageKey.LOCAL_PINS)).then((pins) => {
      const pinGroups: { [index: string]: Pin[] } = {};

      pins.forEach((pin: Pin) => {
        if (pin.group in pinGroups) {
          pinGroups[pin.group].push(pin);
        } else {
          pinGroups[pin.group] = [pin];
        }
      });

      setState({ pinGroups: pinGroups, isLoading: false });
    });
  }, []);

  return state;
};

const getGroupIcon = (groupName: string, groups: Group[]) => {
  // Get the icon for each group displayed in the menu
  const groupMatch = groups?.filter((group) => {
    return group.name == groupName;
  })[0];

  if (groupMatch && groupMatch.icon in iconMap) {
    return iconMap[groupMatch.icon];
  }

  return "";
};

export default function Command() {
  const { pinGroups, isLoading } = usePinGroups();
  const [groups, setGroups] = useGroups();
  const preferences = getPreferenceValues<Preferences>();
  const pinIcon = { source: { light: "pin-icon.svg", dark: "pin-icon@dark.svg" } };

  useEffect(() => {
    // Set initial values for the next pin/group IDs
    Promise.resolve(getStorage(StorageKey.NEXT_PIN_ID)).then((id) => {
      if (id.length == 0) {
        setStorage(StorageKey.NEXT_PIN_ID, [0]);
      }
    });

    Promise.resolve(getStorage(StorageKey.NEXT_GROUP_ID)).then((id) => {
      if (id.length == 0) {
        setStorage(StorageKey.NEXT_GROUP_ID, [0]);
      }
    });
  }, []);

  // If there are pins to display, then display them
  if (Object.keys(pinGroups).length) {
    const usedGroups = { ...pinGroups };

    // Remove the "None" group since it is redundant at this point
    if ("None" in usedGroups) {
      delete usedGroups["None"];
    }

    // Display the menu
    return (
      <MenuBarExtra icon={pinIcon} isLoading={isLoading}>
        {preferences.showCategories && "None" in pinGroups ? <MenuBarExtra.Item title="Pins" /> : null}

        {"None" in pinGroups
          ? pinGroups["None"].map((pin: Pin) => (
              <MenuBarExtra.Item
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
                title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
                onAction={() => open(pin.url)}
              />
            ))
          : null}

        <MenuBarExtra.Separator />

        {preferences.showCategories && groups?.length ? <MenuBarExtra.Item title="Groups" /> : null}
        {Object.keys(usedGroups).map((key) => (
          <MenuBarExtra.Submenu title={key} key={key} icon={getGroupIcon(key, groups as Group[])}>
            {usedGroups[key].map((pin) => (
              <MenuBarExtra.Item
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
                title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
                onAction={() => {
                  try {
                    open(pin.url);
                  } catch {
                    showToast({
                      title:
                        "Failed to open " +
                        (pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)),
                    });
                  }
                }}
              />
            ))}

            <MenuBarExtra.Separator />
            {preferences.showOpenAll ? (
              <MenuBarExtra.Item
                title="Open All"
                onAction={() => usedGroups[key].forEach((pin: Pin) => open(pin.url))}
              />
            ) : null}
          </MenuBarExtra.Submenu>
        ))}

        <MenuBarExtra.Separator />

        <MenuBarExtra.Item title="Copy Pin Data" onAction={() => copyPinData()} />
        <MenuBarExtra.Item title="Preferences..." onAction={() => openExtensionPreferences()} />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon={pinIcon} isLoading={isLoading}>
      <MenuBarExtra.Item title="No pins yet!" />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Preferences..." onAction={() => openExtensionPreferences()} />
    </MenuBarExtra>
  );
}
