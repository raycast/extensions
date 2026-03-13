import { Action, ActionPanel, Icon, Keyboard, List, environment, getPreferenceValues, showToast } from "@raycast/api";
import { LocalDataObject, getRecentApplications } from "../lib/LocalData";
import { Pin, deletePin, disablePin, getPinKeywords, getPins, hidePin, openPin, unhidePin } from "../lib/Pins";
import { PinForm } from "./PinForm";
import { getPinIcon } from "../lib/icons";
import { Direction, PinAction, SORT_STRATEGY, StorageKey, Visibility } from "../lib/constants";
import { setStorage } from "../lib/storage";
import { cutoff } from "../lib/utils";
import { ExtensionPreferences, ViewPinsPreferences } from "../lib/preferences";
import path from "path";
import {
  addApplicationAccessory,
  addCreationDateAccessory,
  addExecutionVisibilityAccessory,
  addExpirationDateAccessory,
  addFrequencyAccessory,
  addLastOpenedAccessory,
  addLinksAccessory,
  addTagAccessories,
  addTextFragmentAccessory,
  addVisibilityAccessory,
} from "../lib/accessories";
import { Group } from "../lib/Groups";
import { PinsInfoPlaceholders } from "../lib/placeholders";
import { bulkApply } from "placeholders-toolkit/dist/lib/apply";
import CopyPinActionsSubmenu from "./actions/CopyPinActionsSubmenu";
import DeletePinAction from "./actions/DeletePinAction";
import { useEffect, useState } from "react";
import CreateNewPinAction from "./actions/CreateNewPinAction";
import { InstallExamplesAction } from "./actions/InstallExamplesAction";

/**
 * Moves a pin up or down in the list of pins. Pins stay within their groups unless grouping is disabled in preferences.
 * @param pin The pin to move.
 * @param direction The direction to move the pin in. One of {@link Direction}.
 * @param setPins The function to update the list of pins.
 */
const movePin = async (pin: Pin, direction: Direction, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  const storedPins: Pin[] = await getPins();
  const preferences = getPreferenceValues<ExtensionPreferences & ViewPinsPreferences>();

  const localPinGroup = storedPins.filter((p) => p.group == pin.group || !preferences.showGroups);
  const positionInGroup = localPinGroup.findIndex((p) => p.id == pin.id);
  const positionOverall = storedPins.findIndex((p) => p.id == pin.id);
  const targetPosition = direction == Direction.UP ? positionInGroup - 1 : positionInGroup + 1;

  if (direction == Direction.UP ? targetPosition >= 0 : targetPosition < localPinGroup.length) {
    const targetPin = localPinGroup[targetPosition];
    const targetGlobalIndex = storedPins.findIndex((p) => p.id == targetPin.id);
    storedPins.splice(targetGlobalIndex, 0, storedPins.splice(positionOverall, 1)[0]);
    setPins(storedPins);
    await setStorage(StorageKey.LOCAL_PINS, storedPins);
  }
};

/**
 * Action to open the Placeholders Guide in the default markdown viewer (might be TextEdit).
 * @returns An action component.
 */
const PlaceholdersGuideAction = () => {
  return (
    <Action.Open
      title="Open Placeholders Guide"
      icon={Icon.Info}
      target={path.resolve(environment.assetsPath, "placeholders_guide.md")}
      shortcut={{ modifiers: ["cmd"], key: "g" }}
    />
  );
};

export default function PinListItem(props: {
  index: number;
  pin: Pin;
  visiblePins: Pin[];
  pins: Pin[];
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>;
  revalidatePins: () => Promise<void>;
  groups: Group[];
  revalidateGroups: () => Promise<void>;
  maxTimesOpened: number;
  showingHidden: boolean;
  setShowingHidden: React.Dispatch<React.SetStateAction<boolean>>;
  lastOpenedPin: Pin | undefined;
  localData: LocalDataObject;
  preferences: ExtensionPreferences & ViewPinsPreferences;
  examplesInstalled: boolean;
  setExamplesInstalled: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    index,
    pin,
    visiblePins,
    pins,
    setPins,
    revalidatePins,
    groups,
    revalidateGroups,
    maxTimesOpened,
    showingHidden,
    setShowingHidden,
    lastOpenedPin,
    localData,
    preferences,
    examplesInstalled,
    setExamplesInstalled,
  } = props;
  const [title, setTitle] = useState<string>(pin.name || cutoff(pin.url, 20));

  useEffect(() => {
    (async () => {
      const newTitle = await bulkApply(pin.name, { allPlaceholders: PinsInfoPlaceholders });
      setTitle(newTitle);
    })();
  }, [pins, pin.name]);

  // Add accessories based on the user's preferences
  const accessories: List.Item.Accessory[] = [];
  if (preferences.showVisibility) addVisibilityAccessory(pin, accessories, showingHidden);
  if (preferences.showLastOpened) addLastOpenedAccessory(pin, accessories, lastOpenedPin?.id);
  if (preferences.showCreationDate) addCreationDateAccessory(pin, accessories);
  if (preferences.showExpiration) addExpirationDateAccessory(pin, accessories);
  if (preferences.showApplication) addApplicationAccessory(pin, accessories);
  if (preferences.showExecutionVisibility) addExecutionVisibilityAccessory(pin, accessories);
  if (preferences.showFragment) addTextFragmentAccessory(pin, accessories);
  if (preferences.showLinkCount) addLinksAccessory(pin, accessories, pins, groups);
  if (preferences.showFrequency) addFrequencyAccessory(pin, accessories, maxTimesOpened);
  if (preferences.showTags) addTagAccessories(pin, accessories);

  const group = groups.find((group) => group.name == pin.group) || { name: "None", icon: "Minus", id: -1 };

  return (
    <List.Item
      title={title}
      subtitle={preferences.showSubtitles ? cutoff(pin.url, 30) : undefined}
      keywords={getPinKeywords(pin)}
      key={pin.id}
      id={pin.id.toString()}
      icon={getPinIcon(pin)}
      accessories={accessories}
      detail={pin.notes?.length ? <List.Item.Detail markdown={pin.notes} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Pin Actions">
            <Action
              title="Open"
              icon={Icon.ChevronRight}
              shortcut={pin.shortcut}
              onAction={async () => {
                await getRecentApplications();
                await openPin(pin, preferences, localData as unknown as { [key: string]: unknown });
                await revalidatePins();
                await revalidateGroups();
              }}
            />

            <Action.Push
              title="Edit"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<PinForm pin={pin} setPins={setPins} pins={pins} />}
            />
            <Action.Push
              title="Duplicate"
              icon={Icon.EyeDropper}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              target={<PinForm pin={{ ...pin, name: pin.name + " Copy", id: -1 }} setPins={setPins} pins={pins} />}
            />

            <Action.CreateQuicklink
              title="Create Quicklink"
              shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
              quicklink={{
                name: pin.name,
                link: `raycast://extensions/HelloImSteven/pins/view-pins?context=${encodeURIComponent(
                  JSON.stringify({
                    pinID: pin.id,
                    action: PinAction.OPEN,
                  }),
                )}`,
              }}
            />

            <ActionPanel.Submenu
              title="Move Pin..."
              icon={Icon.ChevronUpDown}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            >
              {index > 0 &&
              (group?.sortStrategy == SORT_STRATEGY.manual ||
                (!group?.sortStrategy && preferences.defaultSortStrategy == "manual") ||
                (group?.name == undefined && preferences.defaultSortStrategy == "manual")) ? (
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  shortcut={Keyboard.Shortcut.Common.MoveUp}
                  onAction={async () => {
                    await movePin(pin, Direction.UP, setPins);
                  }}
                />
              ) : null}
              {index < pins.length - 1 &&
              visiblePins.length > 1 &&
              (group?.sortStrategy == SORT_STRATEGY.manual ||
                (!group?.sortStrategy && preferences.defaultSortStrategy == "manual") ||
                (group?.name == undefined && preferences.defaultSortStrategy == "manual")) ? (
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={Keyboard.Shortcut.Common.MoveDown}
                  onAction={async () => {
                    await movePin(pin, Direction.DOWN, setPins);
                  }}
                />
              ) : null}
              <ActionPanel.Section title="Between Groups">
                {groups
                  .filter((g) => g.name !== pin.group)
                  .map((group) => (
                    <Action
                      title={`Move to ${group.name}`}
                      key={group.id}
                      icon={Icon.ChevronRight}
                      onAction={async () => {
                        const groupPins = pins.filter((p) => p.group == group.name);
                        const pinIndex = pins.findIndex((p) => p.id == pin.id);
                        if (groupPins.length == 0 || pinIndex == -1) return;

                        pins.splice(pinIndex, 1);
                        pin.group = group.name;
                        const groupStart = pins.findIndex((p) => p.id == groupPins[0].id);
                        const targetIndex = groupStart + groupPins.length;
                        const newPins = [...pins.slice(0, targetIndex), pin, ...pins.slice(targetIndex)];

                        await setStorage(StorageKey.LOCAL_PINS, newPins);
                        await revalidatePins();
                      }}
                    />
                  ))}
                <Action
                  title="Move to Other"
                  key="Other"
                  icon={Icon.ChevronRight}
                  onAction={async () => {
                    const groupPins = pins.filter((p) => p.group == "None");
                    const pinIndex = pins.findIndex((p) => p.id == pin.id);
                    if (groupPins.length == 0 || pinIndex == -1) return;

                    pins.splice(pinIndex, 1);
                    pin.group = "None";
                    const groupStart = pins.findIndex((p) => p.id == groupPins[0].id);
                    const targetIndex = groupStart + groupPins.length;
                    const newPins = [...pins.slice(0, targetIndex), pin, ...pins.slice(targetIndex)];

                    await setStorage(StorageKey.LOCAL_PINS, newPins);
                    await revalidatePins();
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel.Submenu>

            <DeletePinAction pin={pin} setPins={setPins} />
            <Action
              title="Delete All Pins (Keep Groups)"
              icon={Icon.Trash}
              onAction={async () => {
                const storedPins = await getPins();
                for (let index = 0; index < storedPins.length; index++) {
                  await deletePin(storedPins[index], setPins, index == 0, false);
                }
                await showToast({ title: "Deleted All Pins" });
              }}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
            />
          </ActionPanel.Section>
          <CreateNewPinAction setPins={setPins} />
          {!examplesInstalled ? (
            <InstallExamplesAction
              setExamplesInstalled={setExamplesInstalled}
              revalidatePins={revalidatePins}
              revalidateGroups={revalidateGroups}
              kind="pins"
            />
          ) : null}

          <Action
            title={pin.visibility === Visibility.HIDDEN ? "Unhide Pin" : "Hide Pin"}
            icon={pin.visibility === Visibility.HIDDEN ? Icon.Eye : Icon.EyeDisabled}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
            onAction={async () => {
              if (pin.visibility === Visibility.HIDDEN) {
                await unhidePin(pin, setPins);
              } else {
                await hidePin(pin, setPins);
              }
            }}
          />
          <Action
            title={pin.visibility === Visibility.DISABLED ? "Enable Pin" : "Disable Pin"}
            icon={pin.visibility === Visibility.DISABLED ? Icon.Checkmark : Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={async () => {
              if (pin.visibility === Visibility.DISABLED) {
                await unhidePin(pin, setPins);
              } else {
                await disablePin(pin, setPins);
              }
            }}
          />
          <Action
            title={showingHidden ? "Hide Hidden Pins" : "Show Hidden Pins"}
            icon={showingHidden ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            onAction={async () => {
              setShowingHidden(!showingHidden);
            }}
          />

          <PlaceholdersGuideAction />
          <CopyPinActionsSubmenu pin={pin} pins={pins} />
        </ActionPanel>
      }
    />
  );
}
