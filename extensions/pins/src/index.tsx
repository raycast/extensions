import * as fs from "fs";
import * as os from "os";
import path from "path";
import { useEffect } from "react";

import {
  Clipboard,
  environment,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import OpenAllMenuItem from "./components/OpenAllMenuItem";
import PinMenuItem from "./components/PinMenuItem";
import RecentApplicationsList from "./components/RecentApplicationsList";
import { SupportedBrowsers } from "./lib/browser-utils";
import { KEYBOARD_SHORTCUT, StorageKey } from "./lib/constants";
import { createNewGroup, Group, useGroups } from "./lib/Groups";
import { getGroupIcon } from "./lib/icons";
import { useLocalData } from "./lib/LocalData";
import { copyPinData, createNewPin, Pin, sortPins, usePins } from "./lib/Pins";
import { Placeholders } from "./lib/placeholders";
import { cutoff, getStorage, setStorage } from "./lib/utils";
import { ExtensionPreferences } from "./lib/preferences";
import { PinsMenubarPreferences } from "./lib/preferences";

/**
 * Raycast menu bar command providing quick access to pins.
 */
export default function ShowPinsCommand() {
  const { groups, loadingGroups, revalidateGroups } = useGroups();
  const { pins, setPins, loadingPins, revalidatePins } = usePins();
  const [relevantPins, setRelevantPins] = useCachedState<Pin[]>("relevant-pins", []);
  const [irrelevantPins, setIrrelevantPins] = useCachedState<Pin[]>("irrelevant-pins", []);
  const { localData, loadingLocalData } = useLocalData();
  const preferences = getPreferenceValues<ExtensionPreferences & PinsMenubarPreferences>();

  const iconColor =
    preferences.iconColor == "System"
      ? undefined
      : { light: preferences.iconColor, dark: preferences.iconColor, adjustContrast: false };
  const pinIcon = { source: { light: "pin-icon.svg", dark: "pin-icon@dark.svg" }, tintColor: iconColor };

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
            let ruleCount = 0;
            for (const [placeholderText, placeholderValue] of Object.entries(placeholders)) {
              if (
                targetRaw.includes(placeholderText) ||
                placeholderValue.aliases?.some((alias) => targetRaw.includes(alias))
              ) {
                containsPlaceholder = true;
                for (const rule of placeholderValue.rules) {
                  ruleCount++;
                  if (!(await rule(targetRaw, localData))) {
                    passesTests = false;
                  }
                }
              }
            }
            if (containsPlaceholder && passesTests && ruleCount > 0) {
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

  const selectedFiles = localData.selectedFiles.filter(
    (file) =>
      file.path && ((fs.existsSync(file.path) && fs.statSync(file.path).isFile()) || file.path.endsWith(".app/")),
  );

  const allPins = sortPins(
    pins.filter((p) => preferences.showInapplicablePins || !irrelevantPins.find((pin) => pin.id == p.id)),
    groups,
  );

  /**
   * Recursively generates the subsections and subgroups of a group.
   * @param group The group to generate subsections for.
   * @param groups The list of all groups.
   * @returns A submenu containing the group's subsections and pins.
   */
  const getSubsections = (group: Group, groups: Group[]) => {
    const children = groups.filter((g) => g.parent == group.id);
    const memberPins = allPins.filter((pin) => pin.group == group.name);
    const subgroupPins = allPins.filter((pin) => children.some((g) => g.name == pin.group));
    if (memberPins.length == 0 && subgroupPins.length == 0) {
      return null;
    }
    return (
      <MenuBarExtra.Submenu
        title={
          group.name +
          (!preferences.showInapplicablePins &&
          allPins.filter((p) => p.group == group.name).some((pin) => relevantPins.find((p) => p.id == pin.id))
            ? "  ✧"
            : "")
        }
        key={group.id}
        icon={getGroupIcon(group)}
      >
        {[
          children.length > 0 ? children.map((g) => getSubsections(g, groups)) : null,
          allPins
            .filter((pin) => pin.group == group.name)
            .map((pin) => (
              <PinMenuItem
                pin={pin}
                relevant={relevantPins.find((p) => p.id == pin.id) != undefined && !preferences.showInapplicablePins}
                preferences={preferences}
                localData={localData}
                setPins={setPins}
                key={pin.id}
              />
            )),
        ].sort(() => (preferences.topSection == "pins" ? -1 : 1))}
        {memberPins.length > 0 ? (
          <OpenAllMenuItem pins={allPins.filter((p) => p.group == group.name)} submenuName={group.name} />
        ) : null}
      </MenuBarExtra.Submenu>
    );
  };

  const groupSubmenus = groups
    .filter((g) => g.parent == undefined)
    .map((group) => getSubsections(group, groups))
    .filter((g) => g != null);

  // Display the menu
  return (
    <MenuBarExtra icon={pinIcon} isLoading={loadingPins || loadingGroups || loadingLocalData}>
      {[
        [
          <MenuBarExtra.Section title={preferences.showCategories ? "Pins" : undefined} key="pins">
            {allPins.length == 0 ? <MenuBarExtra.Item title="No pins yet!" /> : null}
            {allPins
              .filter((p) => p.group == "None")
              .map((pin: Pin) => (
                <PinMenuItem
                  pin={pin}
                  relevant={relevantPins.find((p) => p.id == pin.id) != undefined && !preferences.showInapplicablePins}
                  preferences={preferences}
                  localData={localData}
                  setPins={setPins}
                  key={pin.id}
                />
              ))}
          </MenuBarExtra.Section>,
          groupSubmenus?.length ? (
            <MenuBarExtra.Section title={preferences.showCategories ? "Groups" : undefined} key="groups">
              {groupSubmenus}
              <RecentApplicationsList />
            </MenuBarExtra.Section>
          ) : null,
        ].sort(() => (preferences.topSection == "pins" ? 1 : -1)),
        preferences.showPinShortcut &&
        !(localData.currentApplication.name == "Finder" && localData.currentDirectory.name == "Desktop") ? (
          <MenuBarExtra.Section title="Quick Pins">
            {localData.currentApplication.name.length > 0 &&
            (localData.currentApplication.name != "Finder" || localData.currentDirectory.name != "Desktop") ? (
              <MenuBarExtra.Item
                title={`Pin This App (${localData.currentApplication.name.substring(0, 20)})`}
                icon={{ fileIcon: localData.currentApplication.path }}
                tooltip="Add a pin whose target path is the path of the current app"
                shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_APP}
                onAction={async () => {
                  await createNewPin(
                    localData.currentApplication.name,
                    localData.currentApplication.path,
                    "Favicon / File Icon",
                    "None",
                    "None",
                    undefined,
                    undefined,
                    false,
                    undefined,
                    undefined,
                  );
                }}
              />
            ) : null}
            {localData.selectedText.trim().length > 0 ? (
              <MenuBarExtra.Item
                title={`Pin Selected Text (${cutoff(localData.selectedText, 20)})`}
                icon={Icon.Text}
                tooltip="Pin the currently selected text as a text fragment"
                shortcut={KEYBOARD_SHORTCUT.PIN_SELECTED_TEXT}
                onAction={async () => {
                  await createNewPin(
                    localData.selectedText.substring(0, 50).trim(),
                    localData.selectedText,
                    "text-16",
                    "None",
                    "None",
                    undefined,
                    undefined,
                    true,
                    undefined,
                    undefined,
                  );
                }}
              />
            ) : null}
            {SupportedBrowsers.includes(localData.currentApplication.name) ? (
              <MenuBarExtra.Item
                title={`Pin This Tab (${cutoff(localData.currentTab.name, 20)})`}
                icon={Icon.AppWindow}
                tooltip="Add a pin whose target URL is the URL of the current browser tab"
                shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_TAB}
                onAction={async () => {
                  await createNewPin(
                    localData.currentTab.name,
                    localData.currentTab.url,
                    "Favicon / File Icon",
                    "None",
                    localData.currentApplication.name,
                    undefined,
                    undefined,
                    false,
                    undefined,
                    undefined,
                  );
                }}
              />
            ) : null}
            {SupportedBrowsers.includes(localData.currentApplication.name) && localData.tabs.length > 1 ? (
              <MenuBarExtra.Item
                title={`Pin All Tabs (${localData.tabs.length})`}
                icon={Icon.AppWindowGrid3x3}
                tooltip="Create a new pin for each tab in the current browser window, pinned to a new group"
                shortcut={KEYBOARD_SHORTCUT.PIN_ALL_TABS}
                onAction={async () => {
                  let newGroupName = "New Tab Group";
                  let iter = 2;
                  while (groups.map((group) => group.name).includes(newGroupName)) {
                    newGroupName = `New Tab Group (${iter})`;
                    iter++;
                  }
                  await createNewGroup(
                    newGroupName,
                    Object.entries(Icon).find((entry) => entry[1] == Icon.AppWindowGrid3x3)?.[0] || "None",
                  );
                  for (const tab of localData.tabs) {
                    await createNewPin(
                      tab.name,
                      tab.url,
                      "Favicon / File Icon",
                      newGroupName,
                      localData.currentApplication.name,
                      undefined,
                      undefined,
                      false,
                      undefined,
                      undefined,
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
                    : `This File (${cutoff(selectedFiles[0].name, 20)})`
                }`}
                icon={{ fileIcon: selectedFiles[0].path }}
                tooltip="Create a pin for each selected file, pinned to a new group"
                shortcut={KEYBOARD_SHORTCUT.PIN_SELECTED_FILES}
                onAction={async () => {
                  if (selectedFiles.length == 1) {
                    await createNewPin(
                      selectedFiles[0].name,
                      selectedFiles[0].path,
                      "Favicon / File Icon",
                      "None",
                      "None",
                      undefined,
                      undefined,
                      false,
                      undefined,
                      undefined,
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
                      Object.entries(Icon).find((entry) => entry[1] == Icon.Document)?.[0] || "None",
                    );
                    for (const file of selectedFiles) {
                      await createNewPin(
                        file.name,
                        file.path,
                        "Favicon / File Icon",
                        newGroupName,
                        "None",
                        undefined,
                        undefined,
                        false,
                        undefined,
                        undefined,
                      );
                    }
                  }
                }}
              />
            ) : null}
            {localData.currentApplication.name == "Finder" && localData.currentDirectory.name != "Desktop" ? (
              <MenuBarExtra.Item
                title={`Pin This Directory (${cutoff(localData.currentDirectory.name, 20)})`}
                icon={{ fileIcon: localData.currentDirectory.path }}
                tooltip="Create a pin whose target path is the current directory of Finder"
                shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_DIRECTORY}
                onAction={async () => {
                  await createNewPin(
                    localData.currentDirectory.name,
                    localData.currentDirectory.path,
                    "Favicon / File Icon",
                    "None",
                    "None",
                    undefined,
                    undefined,
                    false,
                    undefined,
                    undefined,
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
                title={`Pin This Document (${cutoff(localData.currentDocument.name, 20)})`}
                icon={{ fileIcon: localData.currentApplication.path }}
                tooltip="Create a pin whose target path is the document currently open in the frontmost application"
                shortcut={KEYBOARD_SHORTCUT.PIN_CURRENT_DOCUMENT}
                onAction={async () => {
                  await createNewPin(
                    localData.currentDocument.name,
                    localData.currentDocument.path,
                    localData.currentApplication.path,
                    "None",
                    "None",
                    undefined,
                    undefined,
                    false,
                    undefined,
                    undefined,
                  );
                }}
              />
            ) : null}
            {localData.currentApplication.name == "Notes" && localData.selectedNotes.length > 0 ? (
              <MenuBarExtra.Item
                title={`Pin ${
                  localData.selectedNotes.length > 1
                    ? `These Notes (${localData.selectedNotes.length})`
                    : `This Note (${cutoff(localData.selectedNotes[0].name, 20)})`
                }`}
                icon={{ fileIcon: localData.currentApplication.path }}
                tooltip="Create a pin for each selected note, pinned to a new group"
                shortcut={KEYBOARD_SHORTCUT.PIN_SELECTED_NOTES}
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
                      true,
                      false,
                      undefined,
                      undefined,
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
                        true,
                        false,
                        undefined,
                        undefined,
                      );
                    }
                  }
                }}
              />
            ) : null}
          </MenuBarExtra.Section>
        ) : null,
      ].sort(() => (preferences.topSection == "quickPins" ? -1 : 1))}

      <MenuBarExtra.Section>
        {preferences.showCreateNewPin ? (
          <MenuBarExtra.Item
            title="Create New Pin..."
            icon={Icon.PlusSquare}
            tooltip="Create a new pin"
            shortcut={KEYBOARD_SHORTCUT.CREATE_NEW_PIN}
            onAction={() => launchCommand({ name: "new-pin", type: LaunchType.UserInitiated })}
          />
        ) : null}
        {pins.length > 0 && preferences.showCopyPinData ? (
          <MenuBarExtra.Item
            title="Copy Pin Data"
            icon={Icon.CopyClipboard}
            tooltip="Copy the JSON data for all of your pins"
            shortcut={KEYBOARD_SHORTCUT.COPY_PINS_JSON}
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
        {preferences.showOpenPlaceholdersGuide ? (
          <MenuBarExtra.Item
            title="Open Placeholders Guide"
            icon={Icon.QuestionMark}
            tooltip="Open the guide to using placeholders in Pins"
            shortcut={KEYBOARD_SHORTCUT.OPEN_PLACEHOLDERS_GUIDE}
            onAction={async () => await open(path.resolve(environment.assetsPath, "placeholders_guide.md"))}
          />
        ) : null}
        {preferences.showPreferences ? (
          <MenuBarExtra.Item
            title="Preferences..."
            icon={Icon.Gear}
            shortcut={KEYBOARD_SHORTCUT.OPEN_PREFERENCES}
            onAction={async () => await openCommandPreferences()}
          />
        ) : null}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
