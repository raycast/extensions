import { useEffect, useState } from "react";
import { MenuBarExtra, open, openExtensionPreferences, getPreferenceValues, getFrontmostApplication } from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import { setStorage, getStorage, iconMap, useGroups, copyPinData, openPin, createNewPin, getCurrentDirectory } from "./utils";
import { StorageKey } from "./constants";
import { Pin, Group, ExtensionPreferences } from "./types";
import { SupportedBrowsers, getCurrentURL } from "./browser-utils";

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
  const [currentAppName, setCurrentAppName] = useCachedState<string>("current-app-name","");
  const preferences = getPreferenceValues<ExtensionPreferences>();
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

    Promise.resolve(getFrontmostApplication()).then((app) => {
      setCurrentAppName(app.name);
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
        {preferences.showCategories && "None" in pinGroups ? (
          <MenuBarExtra.Section title="Pins">
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
                    onAction={async () => await openPin(pin, preferences)}
                  />
                ))
              : null}
          </MenuBarExtra.Section>
        ) : null}

        {preferences.showCategories && groups?.length ? (
          <MenuBarExtra.Section title="Groups">
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
                    onAction={async () => await openPin(pin, preferences)}
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
          </MenuBarExtra.Section>
        ) : null}

        <MenuBarExtra.Section>
          {preferences.showPinShortcut && SupportedBrowsers.includes(currentAppName) ? <MenuBarExtra.Item title="Pin This Tab" onAction={async () => {
            const currentTab = await getCurrentURL(currentAppName);
            const tabName = currentTab[0]
            const tabURL = currentTab[1]
            await createNewPin(tabName, tabURL, "Favicon / File Icon", "None")
          }} /> : null}
          {preferences.showPinShortcut && currentAppName == "Finder" ? <MenuBarExtra.Item title={`Pin This Directory`} tooltip="Add a pin whose target path is the current directory of Finder" onAction={async () => {
            const currentDir = await getCurrentDirectory();
            const dirName = currentDir[0]
            const dirPath = currentDir[1]
            await createNewPin(dirName, dirPath, "Favicon / File Icon", "None")
          }} /> : null}
          <MenuBarExtra.Item title="Copy Pin Data" tooltip="Copy the JSON data for all of your pins" onAction={() => copyPinData()} />
          <MenuBarExtra.Item title="Preferences..." onAction={() => openExtensionPreferences()} />
        </MenuBarExtra.Section>
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
