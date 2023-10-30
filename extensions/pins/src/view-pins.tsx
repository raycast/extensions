import { useEffect, useState } from "react";
import {
  Icon,
  List,
  Action,
  ActionPanel,
  getPreferenceValues,
  LocalStorage,
  showToast,
  environment,
} from "@raycast/api";
import { setStorage, getStorage, ExtensionPreferences, cutoff } from "./lib/utils";
import { PinForm } from "./components/PinForm";
import { Direction, StorageKey } from "./lib/constants";
import { Pin, checkExpirations, getLastOpenedPin, getPinKeywords, openPin, sortPins, usePins } from "./lib/Pins";
import { useGroups } from "./lib/Groups";
import path from "path";
import {
  addApplicationAccessory,
  addCreationDateAccessory,
  addExecutionVisibilityAccessory,
  addExpirationDateAccessory,
  addFrequencyAccessory,
  addLastOpenedAccessory,
  addTextFragmentAccessory,
} from "./lib/accessories";
import { getPinIcon } from "./lib/icons";
import RecentApplicationsList from "./components/RecentApplicationsList";
import { installExamples } from "./lib/defaults";
import CopyPinActionsSubmenu from "./components/actions/CopyPinActionsSubmenu";
import DeletePinAction from "./components/actions/DeletePinAction";

/**
 * Moves a pin up or down in the list of pins. Pins stay within their groups unless grouping is disabled in preferences.
 * @param pin The pin to move.
 * @param direction The direction to move the pin in. One of {@link Direction}.
 * @param setPins The function to update the list of pins.
 */
const movePin = async (pin: Pin, direction: Direction, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  const storedPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();

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
 * Action to create a new pin. Opens the PinForm view with a blank pin.
 * @param props.setPins The function to set the pins state.
 * @returns An action component.
 */
const CreateNewPinAction = (props: { setPins: React.Dispatch<React.SetStateAction<Pin[]>> }) => {
  const { setPins } = props;
  return (
    <Action.Push
      title="Create New Pin"
      icon={Icon.PlusCircle}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<PinForm setPins={setPins} />}
    />
  );
};

/**
 * Action to install example pins. Only shows if examples are not installed and no pins have been created.
 * @param props.setExamplesInstalled The function to set the examples installed state.
 * @param props.revalidatePins The function to revalidate the pins.
 * @param props.revalidateGroups The function to revalidate the groups.
 * @returns An action component.
 */
const InstallExamplesAction = (props: {
  setExamplesInstalled: React.Dispatch<React.SetStateAction<LocalStorage.Value | undefined>>;
  revalidatePins: () => Promise<void>;
  revalidateGroups: () => Promise<void>;
}) => {
  const { setExamplesInstalled, revalidatePins, revalidateGroups } = props;
  return (
    <Action
      title="Install Example Pins"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={async () => {
        await installExamples();
        setExamplesInstalled(true);
        await revalidatePins();
        await revalidateGroups();
        await showToast({ title: "Examples Installed!" });
      }}
    />
  );
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

/**
 * Preferences for the View Pins command.
 */
interface CommandPreferences {
  /**
   * Whether to display groups as separate sections.
   */
  showGroups: boolean;

  /**
   * Whether to display subtitles for pins.
   */
  showSubtitles: boolean;

  /**
   * Whether to display icons for applications that pins open with, if one is specified.
   */
  showApplication: boolean;

  /**
   * Whether to display a the initial creation date of each pin.
   */
  showCreationDate: boolean;

  /**
   * Whether to display the expiration date for pins that have one.
   */
  showExpiration: boolean;

  /**
   * Whether to display the execution visibility for Terminal command pins.
   */
  showExecutionVisibility: boolean;

  /**
   * Whether to display an icon accessory for text fragments.
   */
  showFragment: boolean;

  /**
   * Whether to display the number of times a pin has been opened.
   */
  showFrequency: boolean;

  /**
   * Whether to display an indicator for the most recently opened pin.
   */
  showLastOpened: boolean;
}

/**
 * Raycast command to view all pins in a list within the Raycast window.
 */
export default function ViewPinsCommand() {
  const { pins, setPins, loadingPins, revalidatePins } = usePins();
  const { groups, loadingGroups, revalidateGroups } = useGroups();
  const [examplesInstalled, setExamplesInstalled] = useState<LocalStorage.Value | undefined>(true);
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();

  useEffect(() => {
    Promise.resolve(LocalStorage.getItem(StorageKey.EXAMPLES_INSTALLED)).then((examplesInstalled) => {
      setExamplesInstalled(examplesInstalled);
    });
    Promise.resolve(checkExpirations());
  }, []);

  const maxTimesOpened = Math.max(...pins.map((pin) => pin.timesOpened || 0));

  /**
   * Gets the list of pins as a list of ListItems.
   * @param pins The list of pins.
   * @returns A list of ListItems.
   */
  const getPinListItems = (pins: Pin[]) => {
    return sortPins(pins, groups).map((pin, index) => {
      // Add accessories based on the user's preferences
      const accessories: List.Item.Accessory[] = [];
      if (preferences.showLastOpened) addLastOpenedAccessory(pin, accessories, getLastOpenedPin(pins)?.id);
      if (preferences.showCreationDate) addCreationDateAccessory(pin, accessories);
      if (preferences.showExpiration) addExpirationDateAccessory(pin, accessories);
      if (preferences.showApplication) addApplicationAccessory(pin, accessories);
      if (preferences.showExecutionVisibility) addExecutionVisibilityAccessory(pin, accessories);
      if (preferences.showFragment) addTextFragmentAccessory(pin, accessories);
      if (preferences.showFrequency) addFrequencyAccessory(pin, accessories, maxTimesOpened);

      const group = groups.find((group) => group.name == pin.group) || { name: "None", icon: "Minus", id: -1 };
      return (
        <List.Item
          title={pin.name || cutoff(pin.url, 20)}
          subtitle={preferences.showSubtitles ? cutoff(pin.url, 30) : undefined}
          keywords={getPinKeywords(pin)}
          key={pin.id}
          icon={getPinIcon(pin)}
          accessories={accessories}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Pin Actions">
                <Action title="Open" icon={Icon.ChevronRight} onAction={async () => await openPin(pin, preferences)} />

                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<PinForm pin={pin} setPins={setPins} pins={pins} />}
                />
                <Action.Push
                  title="Duplicate"
                  icon={Icon.EyeDropper}
                  shortcut={{ modifiers: ["cmd", "ctrl"], key: "d" }}
                  target={<PinForm pin={{ ...pin, name: pin.name + " Copy", id: -1 }} setPins={setPins} pins={pins} />}
                />

                {index > 0 &&
                (group?.sortStrategy == "manual" ||
                  (!group?.sortStrategy && preferences.defaultSortStrategy == "manual") ||
                  (group?.name == undefined && preferences.defaultSortStrategy == "manual")) ? (
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                    onAction={async () => {
                      await movePin(pin, Direction.UP, setPins);
                    }}
                  />
                ) : null}
                {index < pins.length - 1 &&
                (group?.sortStrategy == "manual" ||
                  (!group?.sortStrategy && preferences.defaultSortStrategy == "manual") ||
                  (group?.name == undefined && preferences.defaultSortStrategy == "manual")) ? (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    onAction={async () => {
                      await movePin(pin, Direction.DOWN, setPins);
                    }}
                  />
                ) : null}
                <DeletePinAction pin={pin} setPins={setPins} />
              </ActionPanel.Section>
              <CreateNewPinAction setPins={setPins} />
              <PlaceholdersGuideAction />
              <CopyPinActionsSubmenu pin={pin} pins={pins} />
            </ActionPanel>
          }
        />
      );
    });
  };

  return (
    <List
      isLoading={loadingPins || loadingGroups}
      searchBarPlaceholder="Search pins..."
      filtering={{ keepSectionOrder: true }}
      actions={
        <ActionPanel>
          <CreateNewPinAction setPins={setPins} />
          {!examplesInstalled && pins.length == 0 ? (
            <InstallExamplesAction
              setExamplesInstalled={setExamplesInstalled}
              revalidatePins={revalidatePins}
              revalidateGroups={revalidateGroups}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="No Pins Yet!"
        description="Add a custom pin (⌘N)  or install some examples (⌘E)"
        icon="no-view.png"
      />
      {[{ name: "None", icon: "Minus", id: -1 }].concat(groups).map((group) =>
        preferences.showGroups ? (
          <List.Section title={group.name == "None" ? "Other" : group.name} key={group.id}>
            {getPinListItems(pins.filter((pin) => pin.group == group.name))}
          </List.Section>
        ) : (
          getPinListItems(pins.filter((pin) => pin.group == group.name))
        )
      )}

      <RecentApplicationsList
        pinActions={
          <>
            <CreateNewPinAction setPins={setPins} />
            {!examplesInstalled && pins.length == 0 ? (
              <InstallExamplesAction
                setExamplesInstalled={setExamplesInstalled}
                revalidatePins={revalidatePins}
                revalidateGroups={revalidateGroups}
              />
            ) : null}
          </>
        }
      />
    </List>
  );
}
