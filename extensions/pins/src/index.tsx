import { useEffect } from "react";
import {
  MenuBarExtra,
  openExtensionPreferences,
  getPreferenceValues,
  Icon,
  Clipboard,
  showHUD,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { setStorage, getStorage, iconMap, copyPinData, ExtensionPreferences, getIcon } from "./lib/utils";
import { StorageKey } from "./lib/constants";
import { SupportedBrowsers } from "./lib/browser-utils";
import * as fs from "fs";
import { useLocalData } from "./lib/LocalData";
import { createNewGroup, useGroups } from "./lib/Groups";
import { Pin, createNewPin, deletePin, openPin, usePins } from "./lib/Pins";
import { useCachedState } from "@raycast/utils";
import * as os from "os";
import { Placeholders } from "./lib/placeholders";

/**
 * Preferences for the menu bar extra.
 */
interface CommandPreferences {
  /**
   * Whether to show category labels (e.g. "Pins", "Groups", "Quick Pins") in the menu bar dropdown.
   */
  showCategories: boolean;

  /**
   * Whether to show the "Open All" button within group submenus.
   */
  showOpenAll: boolean;

  /**
   * Whether to show the "Create New Pin" button.
   */
  showCreateNewPin: boolean;

  /**
   * Whether to show the "Quick Pins" section.
   */
  showPinShortcut: boolean;

  /**
   * Whether to display pins that are not applicable to the current context. For example, if this is disabled, pins requiring selected text will not be shown if no text is selected.
   */
  showInapplicablePins: boolean;
}

export default function Command() {
  const { groups, loadingGroups, revalidateGroups } = useGroups();
  const { pins, setPins, loadingPins, revalidatePins } = usePins();
  const [relevantPins, setRelevantPins] = useCachedState<Pin[]>("relevant-pins", []);
  const [irrelevantPins, setIrrelevantPins] = useCachedState<Pin[]>("irrelevant-pins", []);
  const { localData, loadingLocalData } = useLocalData();
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();
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

    Promise.resolve(revalidateGroups())
      .then(() => Promise.resolve(revalidatePins()))
      .then(async () => {
        if (!preferences.showInapplicablePins) {
          const applicablePins = [];
          const inapplicablePins = [];
          for (const pin of pins) {
            const targetRaw = pin.url.startsWith("~") ? pin.url.replace("~", os.homedir()) : pin.url;
            const placeholders = Placeholders.allPlaceholders;
            let containsPlaceholder = false;
            let passesTests = true;
            for (const [placeholderText, placeholderValue] of Object.entries(placeholders)) {
              if (
                targetRaw.includes(placeholderText) ||
                placeholderValue.aliases?.some((alias) => targetRaw.includes(alias))
              ) {
                containsPlaceholder = true;
                for (const rule of placeholderValue.rules) {
                  if (!(await rule(targetRaw))) {
                    passesTests = false;
                  }
                }
              }
            }
            if (containsPlaceholder && passesTests) {
              applicablePins.push(pin);
            } else if (!passesTests) {
              inapplicablePins.push(pin);
            }
          }
          setRelevantPins(applicablePins);
          setIrrelevantPins(inapplicablePins);
        }
      });
  }, []);

  // If there are pins to display, then display them
  const pinsToShow = preferences.showInapplicablePins
    ? pins
    : pins.filter((pin) => irrelevantPins.find((p) => p.id == pin.id) == undefined);
  const usedGroups = groups
    ?.filter((group) => {
      return pinsToShow.some((pin) => pin.group == group.name);
    })
    .reduce(
      (obj: { [index: string]: Pin[] }, group) => {
        obj[group.name] = pinsToShow.filter((pin) => pin.group == group.name);
        return obj;
      },
      { None: pinsToShow.filter((pin) => pin.group == "None") }
    );

  if (preferences.showRecentApplications && localData.recentApplications.length > 1) {
    let pseudoPinID = Math.max(...pins.map((pin) => pin.id));
    usedGroups["Recent Applications"] = localData.recentApplications.slice(1).map((app) => {
      pseudoPinID++;
      return {
        id: pseudoPinID,
        name: app.name,
        url: app.path,
        icon: app.path,
        group: "Recent Applications",
        application: "None",
        date: undefined,
        execInBackground: false,
      };
    });
  }

  const pinGroups = Object.values(usedGroups).reduce((obj: { [index: string]: Pin[] }, pins) => {
    pins.forEach((pin) => {
      if (pin.group in obj) {
        obj[pin.group].push(pin);
      } else {
        obj[pin.group] = [pin];
      }
    });
    return obj;
  }, {});

  // Remove the "None" group since it is redundant at this point
  if ("None" in usedGroups) {
    delete usedGroups["None"];
  }

  const selectedFiles = localData.selectedFiles.filter(
    (file) =>
      file.path && ((fs.existsSync(file.path) && fs.statSync(file.path).isFile()) || file.path.endsWith(".app/"))
  );

  // Display the menu
  return (
    <MenuBarExtra icon={pinIcon} isLoading={loadingPins || loadingGroups || loadingLocalData}>
      {pins.length == 0 ? <MenuBarExtra.Item title="No pins yet!" /> : null}
      {[
        "None" in pinGroups ? (
          <MenuBarExtra.Section title={preferences.showCategories ? "Pins" : undefined} key="pins">
            {"None" in pinGroups
              ? pinGroups["None"].map((pin: Pin) => (
                  <MenuBarExtra.Item
                    key={pin.id}
                    icon={
                      pin.icon in iconMap || pin.icon == "None" || pin.icon.startsWith("/")
                        ? getIcon(pin.icon)
                        : getIcon(pin.url)
                    }
                    title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
                    subtitle={
                      !preferences.showInapplicablePins && relevantPins.find((p) => p.id == pin.id) ? "  ✧" : ""
                    }
                    onAction={async (event) => {
                      if (event.type == "left-click") {
                        await openPin(pin, preferences);
                      } else {
                        await deletePin(pin, setPins);
                      }
                    }}
                  />
                ))
              : null}
          </MenuBarExtra.Section>
        ) : null,
        groups?.length && Object.keys(usedGroups).length ? (
          <MenuBarExtra.Section title={preferences.showCategories ? "Groups" : undefined} key="groups">
            {Object.keys(usedGroups).map((key) => (
              <MenuBarExtra.Submenu
                title={
                  key +
                  (!preferences.showInapplicablePins &&
                  usedGroups[key].some((pin) => relevantPins.find((p) => p.id == pin.id))
                    ? "  ✧"
                    : "")
                }
                key={key}
                icon={
                  key == "Recent Applications"
                    ? Icon.Clock
                    : getIcon(groups.find((group) => group.name == key)?.icon || "")
                }
              >
                {usedGroups[key].map((pin) => (
                  <MenuBarExtra.Item
                    key={pin.id}
                    icon={
                      pin.icon in iconMap || pin.icon == "None" || pin.icon.startsWith("/")
                        ? getIcon(pin.icon)
                        : getIcon(pin.url)
                    }
                    title={pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)}
                    subtitle={
                      !preferences.showInapplicablePins && relevantPins.find((p) => p.id == pin.id) ? "  ✧" : ""
                    }
                    onAction={async (event) => {
                      if (event.type == "left-click" || key == "Recent Applications") {
                        await openPin(pin, preferences);
                      } else {
                        await deletePin(pin, setPins);
                      }
                    }}
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
        ) : null,
      ].sort(() => (preferences.topSection == "pins" ? 1 : -1))}

      {preferences.showPinShortcut &&
      !(localData.currentApplication.name == "Finder" && localData.currentDirectory.name == "Desktop") ? (
        <MenuBarExtra.Section title="Quick Pins">
          {localData.currentApplication.name.length > 0 &&
          (localData.currentApplication.name != "Finder" || localData.currentDirectory.name != "Desktop") ? (
            <MenuBarExtra.Item
              title={`Pin This App (${localData.currentApplication.name.substring(0, 20)})`}
              icon={{ fileIcon: localData.currentApplication.path }}
              tooltip="Add a pin whose target path is the path of the current app"
              onAction={async () => {
                await createNewPin(
                  localData.currentApplication.name,
                  localData.currentApplication.path,
                  "Favicon / File Icon",
                  "None",
                  "None",
                  undefined,
                  undefined
                );
              }}
            />
          ) : null}
          {SupportedBrowsers.includes(localData.currentApplication.name) ? (
            <MenuBarExtra.Item
              title={`Pin This Tab (${localData.currentTab.name.substring(0, 20).trim()}${
                localData.currentTab.name.length > 20 ? "..." : ""
              })`}
              icon={Icon.AppWindow}
              tooltip="Add a pin whose target URL is the URL of the current browser tab"
              onAction={async () => {
                await createNewPin(
                  localData.currentTab.name,
                  localData.currentTab.url,
                  "Favicon / File Icon",
                  "None",
                  localData.currentApplication.name,
                  undefined,
                  undefined
                );
              }}
            />
          ) : null}
          {SupportedBrowsers.includes(localData.currentApplication.name) && localData.tabs.length > 1 ? (
            <MenuBarExtra.Item
              title={`Pin All Tabs (${localData.tabs.length})`}
              icon={Icon.AppWindowGrid3x3}
              tooltip="Create a new pin for each tab in the current browser window, pinned to a new group"
              onAction={async () => {
                let newGroupName = "New Tab Group";
                let iter = 2;
                while (groups.map((group) => group.name).includes(newGroupName)) {
                  newGroupName = `New Tab Group (${iter})`;
                  iter++;
                }
                await createNewGroup(
                  newGroupName,
                  Object.entries(Icon).find((entry) => entry[1] == Icon.AppWindowGrid3x3)?.[0] || "None"
                );
                for (const tab of localData.tabs) {
                  await createNewPin(
                    tab.name,
                    tab.url,
                    "Favicon / File Icon",
                    newGroupName,
                    localData.currentApplication.name,
                    undefined,
                    undefined
                  );
                }
              }}
            />
          ) : null}
          {localData.currentApplication.name == "Finder" && selectedFiles.length > 0 ? (
            <MenuBarExtra.Item
              title={`Pin ${
                selectedFiles.length > 1
                  ? `These Files (${selectedFiles.length})`
                  : `This File (${selectedFiles[0].name.substring(0, 20).trim()}${
                      selectedFiles[0].name.length > 20 ? "..." : ""
                    })`
              }`}
              icon={{ fileIcon: selectedFiles[0].path }}
              tooltip="Create a pin for each selected file, pinned to a new group"
              onAction={async () => {
                if (selectedFiles.length == 1) {
                  await createNewPin(
                    selectedFiles[0].name,
                    selectedFiles[0].path,
                    "Favicon / File Icon",
                    "None",
                    "None",
                    undefined,
                    undefined
                  );
                } else {
                  let newGroupName = "New File Group";
                  let iter = 2;
                  while (groups.map((group) => group.name).includes(newGroupName)) {
                    newGroupName = `New File Group (${iter})`;
                    iter++;
                  }
                  await createNewGroup(
                    newGroupName,
                    Object.entries(Icon).find((entry) => entry[1] == Icon.Document)?.[0] || "None"
                  );
                  for (const file of selectedFiles) {
                    await createNewPin(
                      file.name,
                      file.path,
                      "Favicon / File Icon",
                      newGroupName,
                      "None",
                      undefined,
                      undefined
                    );
                  }
                }
              }}
            />
          ) : null}
          {localData.currentApplication.name == "Finder" && localData.currentDirectory.name != "Desktop" ? (
            <MenuBarExtra.Item
              title={`Pin This Directory (${localData.currentDirectory.name.substring(0, 20).trim()}${
                localData.currentDirectory.name.length > 20 ? "..." : ""
              })`}
              icon={{ fileIcon: localData.currentDirectory.path }}
              tooltip="Create a pin whose target path is the current directory of Finder"
              onAction={async () => {
                await createNewPin(
                  localData.currentDirectory.name,
                  localData.currentDirectory.path,
                  "Favicon / File Icon",
                  "None",
                  "None",
                  undefined,
                  undefined
                );
              }}
            />
          ) : null}
          {[
            "TextEdit",
            "Pages",
            "Numbers",
            "Keynote",
            "Microsoft Word",
            "Microsoft Excel",
            "Microsoft PowerPoint",
            "Script Editor",
          ].includes(localData.currentApplication.name) && localData.currentDocument.path != "" ? (
            <MenuBarExtra.Item
              title={`Pin This Document (${localData.currentDocument.name.substring(0, 20).trim()}${
                localData.currentDocument.name.length > 20 ? "..." : ""
              })`}
              icon={{ fileIcon: localData.currentApplication.path }}
              tooltip="Create a pin whose target path is the current directory of Finder"
              onAction={async () => {
                await createNewPin(
                  localData.currentDocument.name,
                  localData.currentDocument.path,
                  localData.currentApplication.path,
                  "None",
                  "None",
                  undefined,
                  undefined
                );
              }}
            />
          ) : null}
          {localData.currentApplication.name == "Notes" && localData.selectedNotes.length > 0 ? (
            <MenuBarExtra.Item
              title={`Pin ${
                localData.selectedNotes.length > 1
                  ? `These Notes (${localData.selectedNotes.length})`
                  : `This Note (${localData.selectedNotes[0].name.substring(0, 20).trim()}${
                      localData.selectedNotes[0].name.length > 20 ? "..." : ""
                    })`
              }`}
              icon={{ fileIcon: localData.currentApplication.path }}
              tooltip="Create a pin for each selected note, pinned to a new group"
              onAction={async () => {
                if (localData.selectedNotes.length == 1) {
                  const cmd = `osascript -e 'Application("Notes").notes.byId("${localData.selectedNotes[0].id}").show()' -l "JavaScript"`;
                  await createNewPin(
                    localData.selectedNotes[0].name,
                    cmd,
                    localData.currentApplication.path,
                    "None",
                    "None",
                    undefined,
                    true
                  );
                } else {
                  let newGroupName = "New Note Group";
                  let iter = 2;
                  while (groups.map((group) => group.name).includes(newGroupName)) {
                    newGroupName = `New Note Group (${iter})`;
                    iter++;
                  }
                  await createNewGroup(newGroupName, localData.currentApplication.path);
                  for (const note of localData.selectedNotes) {
                    const cmd = `osascript -e 'Application("Notes").notes.byId("${note.id}").show()' -l "JavaScript"`;
                    await createNewPin(
                      note.name,
                      cmd,
                      localData.currentApplication.path,
                      newGroupName,
                      "None",
                      undefined,
                      true
                    );
                  }
                }
              }}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        {preferences.showCreateNewPin ? (
          <MenuBarExtra.Item
            title="Create New Pin..."
            icon={Icon.PlusSquare}
            tooltip="Create a new pin"
            onAction={() => launchCommand({ name: "new-pin", type: LaunchType.UserInitiated })}
          />
        ) : null}
        {pins.length > 0 ? (
          <MenuBarExtra.Item
            title="Copy Pin Data"
            icon={Icon.CopyClipboard}
            tooltip="Copy the JSON data for all of your pins"
            onAction={async () => {
              const data = await copyPinData();
              const text = await Clipboard.readText();
              if (text == data) {
                await showHUD("Copied pin data to clipboard!");
              } else {
                await showHUD("Failed to copy pins to clipboard.");
              }
            }}
          />
        ) : null}
        <MenuBarExtra.Item title="Preferences..." icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
