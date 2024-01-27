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

import OpenAllMenuItem from "./components/menu-items/OpenAllMenuItem";
import PinMenuItem from "./components/menu-items/PinMenuItem";
import RecentApplicationsList from "./components/RecentApplicationsList";
import { KEYBOARD_SHORTCUT } from "./lib/constants";
import { Group, useGroups } from "./lib/Groups";
import { getGroupIcon } from "./lib/icons";
import { useLocalData } from "./lib/LocalData";
import { copyPinData, Pin, sortPins, usePins } from "./lib/Pins";
import { ExtensionPreferences, GroupDisplaySetting } from "./lib/preferences";
import { PinsMenubarPreferences } from "./lib/preferences";
import PinsPlaceholders from "./lib/placeholders";
import NotesQuickPin from "./components/menu-items/quick-pins/NotesQuickPin";
import AppQuickPin from "./components/menu-items/quick-pins/AppQuickPin";
import TextQuickPin from "./components/menu-items/quick-pins/TextQuickPin";
import TabQuickPin from "./components/menu-items/quick-pins/TabQuickPin";
import TabsQuickPin from "./components/menu-items/quick-pins/TabsQuickPin";
import FilesQuickPin from "./components/menu-items/quick-pins/FilesQuickPin";
import DirectoryQuickPin from "./components/menu-items/quick-pins/DirectoryQuickPin";
import DocumentQuickPin from "./components/menu-items/quick-pins/DocumentQuickPin";
import TrackQuickPin from "./components/menu-items/quick-pins/TrackQuickPin";
import TargetGroupMenu from "./components/TargetGroupMenu";

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
    Promise.resolve(revalidateGroups())
      .then(() => Promise.resolve(revalidatePins()))
      .then(async () => {
        if (!preferences.showInapplicablePins) {
          const applicablePins = [];
          const inapplicablePins = [];
          for (const pin of pins) {
            const targetRaw = pin.url.startsWith("~") ? pin.url.replace("~", os.homedir()) : pin.url;
            const placeholders = PinsPlaceholders;
            let containsPlaceholder = false;
            let passesTests = true;
            let ruleCount = 0;
            for (const placeholder of placeholders) {
              if (targetRaw.match(placeholder.regex)) {
                containsPlaceholder = true;
                for (const rule of placeholder.rules || []) {
                  ruleCount++;
                  if (!(await rule(targetRaw, localData as unknown as { [key: string]: unknown }))) {
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

    if (preferences.groupDisplaySetting === GroupDisplaySetting.Subsections) {
      return (
        <MenuBarExtra.Section title={group.name} key={group.id}>
          {memberPins.map((pin) => (
            <PinMenuItem
              pin={pin}
              relevant={relevantPins.find((p) => p.id == pin.id) != undefined && !preferences.showInapplicablePins}
              preferences={preferences}
              localData={localData}
              setPins={setPins}
              key={pin.id}
            />
          ))}
          {children.map((g) => getSubsections(g, groups))}
          {subgroupPins.length > 0 ? (
            <OpenAllMenuItem pins={allPins.filter((p) => p.group == group.name)} submenuName={group.name} />
          ) : null}
        </MenuBarExtra.Section>
      );
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

  const groupSubmenus =
    preferences.groupDisplaySetting === GroupDisplaySetting.None
      ? []
      : groups
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
              .filter((p) => (preferences.groupDisplaySetting !== GroupDisplaySetting.None ? p.group == "None" : true))
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
        !(
          localData.currentApplication.name == "Finder" &&
          localData.currentDirectory.name == "Desktop" &&
          localData.selectedFiles.length == 0
        ) ? (
          <MenuBarExtra.Section title="Quick Pins">
            <AppQuickPin app={localData.currentApplication} />
            <TextQuickPin />
            <TabQuickPin app={localData.currentApplication} tab={localData.currentTab} />
            <TabsQuickPin app={localData.currentApplication} tabs={localData.tabs} groups={groups} />
            <FilesQuickPin app={localData.currentApplication} selectedFiles={selectedFiles} groups={groups} />
            <DirectoryQuickPin app={localData.currentApplication} directory={localData.currentDirectory} />
            <DocumentQuickPin app={localData.currentApplication} document={localData.currentDocument} />
            <TrackQuickPin app={localData.currentApplication} track={localData.currentTrack} />
            <NotesQuickPin app={localData.currentApplication} notes={localData.selectedNotes} groups={groups} />
            <TargetGroupMenu groups={groups} />
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
