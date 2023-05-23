import { useEffect, useState } from "react";
import {
  MenuBarExtra,
  openExtensionPreferences,
  getPreferenceValues,
  getFrontmostApplication,
  Icon,
} from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import {
  setStorage,
  getStorage,
  iconMap,
  useGroups,
  copyPinData,
  openPin,
  createNewPin,
  getCurrentDirectory,
} from "./utils";
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
  const [currentApp, setCurrentApp] = useCachedState<string[]>("current-app-name", ["", "", ""]);
  const [currentTab, setCurrentTab] = useCachedState<string[]>("current-tab-name", ["", ""]);
  const [currentDir, setCurrentDir] = useCachedState<string[]>("current-directory", ["", ""]);
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

    Promise.resolve(getFrontmostApplication())
      .then((app) => {
        setCurrentApp([app.name, app.path, app.bundleId || ""]);
        return app.name;
      })
      .then((appName) => {
        if (appName == "Finder") {
          Promise.resolve(getCurrentDirectory()).then((dir) => {
            setCurrentDir(dir);
          });
        } else if (SupportedBrowsers.includes(appName)) {
          Promise.resolve(getCurrentURL(appName)).then((tab) => {
            setCurrentTab(tab);
          });
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
                        : pin.url.startsWith("/") || pin.url.startsWith("~")
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

        {preferences.showCategories && groups?.length && Object.keys(usedGroups).length ? (
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
                        : pin.url.startsWith("/") || pin.url.startsWith("~")
                        ? { fileIcon: pin.url }
                        : getFavicon(pin.url)
                    }
                    title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
                    onAction={async () => await openPin(pin, preferences)}
                  />
                ))}

                <MenuBarExtra.Section>
                  {preferences.showOpenAll ? (
                    <MenuBarExtra.Item
                      title="Open All"
                      onAction={() => usedGroups[key].forEach((pin: Pin) => openPin(pin, preferences))}
                    />
                  ) : null}
                </MenuBarExtra.Section>
              </MenuBarExtra.Submenu>
            ))}
          </MenuBarExtra.Section>
        ) : null}

        <MenuBarExtra.Section>
          {(preferences.showPinShortcut && currentApp[0].length > 0 && currentApp[0] != "Finder") ||
          currentDir[0] != "Desktop" ? (
            <MenuBarExtra.Item
              title={`Pin This App (${currentApp[0].substring(0, 20)})`}
              icon={{ fileIcon: currentApp[1] }}
              tooltip="Add a pin whose target path is the path of the current app"
              onAction={async () => {
                await createNewPin(currentApp[0], currentApp[1], "Favicon / File Icon", "None");
              }}
            />
          ) : null}
          {preferences.showPinShortcut && SupportedBrowsers.includes(currentApp[0]) ? (
            <MenuBarExtra.Item
              title={`Pin This Tab (${currentTab[0].substring(0, 20).trim()}${currentTab[0].length > 20 ? "..." : ""})`}
              icon={Icon.AppWindow}
              tooltip="Add a pin whose target URL is the URL of the current browser tab"
              onAction={async () => {
                await createNewPin(currentTab[0], currentTab[1], "Favicon / File Icon", "None");
              }}
            />
          ) : null}
          {preferences.showPinShortcut && currentApp[0] == "Finder" && currentDir[0] != "Desktop" ? (
            <MenuBarExtra.Item
              title={`Pin This Directory (${currentDir[0].substring(0, 20).trim()}${
                currentDir[0].length > 20 ? "..." : ""
              })`}
              icon={Icon.Folder}
              tooltip="Add a pin whose target path is the current directory of Finder"
              onAction={async () => {
                await createNewPin(currentDir[0], currentDir[1], "Favicon / File Icon", "None");
              }}
            />
          ) : null}
          <MenuBarExtra.Item
            title="Copy Pin Data"
            icon={Icon.CopyClipboard}
            tooltip="Copy the JSON data for all of your pins"
            onAction={() => copyPinData()}
          />
          <MenuBarExtra.Item title="Preferences..." icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon={pinIcon} isLoading={isLoading}>
      <MenuBarExtra.Item title="No pins yet!" />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Preferences..." icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
