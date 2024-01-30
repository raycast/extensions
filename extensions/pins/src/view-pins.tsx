import { useEffect, useState } from "react";
import {
  Icon,
  List,
  Action,
  ActionPanel,
  getPreferenceValues,
  LocalStorage,
  environment,
  Keyboard,
  showToast,
} from "@raycast/api";
import { cutoff, pluralize } from "./lib/utils";
import { setStorage, getStorage } from "./lib/storage";
import { ExtensionPreferences } from "./lib/preferences";
import { PinForm } from "./components/PinForm";
import { Direction, StorageKey } from "./lib/constants";
import {
  Pin,
  checkExpirations,
  deletePin,
  getLastOpenedPin,
  getPinKeywords,
  openPin,
  sortPins,
  usePins,
} from "./lib/Pins";
import { useGroups } from "./lib/Groups";
import path from "path";
import {
  addApplicationAccessory,
  addCreationDateAccessory,
  addExecutionVisibilityAccessory,
  addExpirationDateAccessory,
  addFrequencyAccessory,
  addLastOpenedAccessory,
  addTagAccessories,
  addTextFragmentAccessory,
} from "./lib/accessories";
import { getPinIcon } from "./lib/icons";
import RecentApplicationsList from "./components/RecentApplicationsList";
import CopyPinActionsSubmenu from "./components/actions/CopyPinActionsSubmenu";
import DeletePinAction from "./components/actions/DeletePinAction";
import { InstallExamplesAction } from "./components/actions/InstallExamplesAction";
import { ViewPinsPreferences } from "./lib/preferences";
import { getRecentApplications, useLocalData } from "./lib/LocalData";

/**
 * Moves a pin up or down in the list of pins. Pins stay within their groups unless grouping is disabled in preferences.
 * @param pin The pin to move.
 * @param direction The direction to move the pin in. One of {@link Direction}.
 * @param setPins The function to update the list of pins.
 */
const movePin = async (pin: Pin, direction: Direction, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  const storedPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
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
      shortcut={Keyboard.Shortcut.Common.New}
      target={<PinForm setPins={setPins} />}
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
 * Raycast command to view all pins in a list within the Raycast window.
 */
export default function ViewPinsCommand(args: { launchContext?: { pinID?: number } }) {
  const { pins, setPins, loadingPins, revalidatePins } = usePins();
  const { groups, loadingGroups, revalidateGroups } = useGroups();
  const [examplesInstalled, setExamplesInstalled] = useState<LocalStorage.Value | undefined>(true);
  const preferences = getPreferenceValues<ExtensionPreferences & ViewPinsPreferences>();
  const { localData, loadingLocalData } = useLocalData();
  const [selectedPinID, setSelectedPinID] = useState<string | null>(null);
  const [filteredTag, setFilteredTag] = useState<string>("all");

  useEffect(() => {
    Promise.resolve(LocalStorage.getItem(StorageKey.EXAMPLE_PINS_INSTALLED)).then((examplesInstalled) => {
      setExamplesInstalled(examplesInstalled);
    });
    Promise.resolve(checkExpirations());
  }, []);

  if (args.launchContext?.pinID) {
    const pin = pins.find((pin) => pin.id == args.launchContext?.pinID);
    if (pin) {
      return <PinForm pin={pin} setPins={setPins} pins={pins} />;
    }
  }

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
      if (preferences.showTags) addTagAccessories(pin, accessories);

      const group = groups.find((group) => group.name == pin.group) || { name: "None", icon: "Minus", id: -1 };
      return (
        <List.Item
          title={pin.name || cutoff(pin.url, 20)}
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

                {index > 0 &&
                (group?.sortStrategy == "manual" ||
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
                (group?.sortStrategy == "manual" ||
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
                <DeletePinAction pin={pin} setPins={setPins} />
                <Action
                  title="Delete All Pins (Keep Groups)"
                  icon={Icon.Trash}
                  onAction={async () => {
                    const storedPins = await getStorage(StorageKey.LOCAL_PINS);
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
              <PlaceholdersGuideAction />
              <CopyPinActionsSubmenu pin={pin} pins={pins} />
            </ActionPanel>
          }
        />
      );
    });
  };

  const tagCounts = pins.reduce(
    (acc, pin) => {
      pin.tags?.forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    },
    {} as { [key: string]: number },
  );
  const tagNames = Object.keys(tagCounts);

  const pinsWithNotes = pins.filter((pin) => pin.notes?.length).map((pin) => pin.id.toString());

  return (
    <List
      isLoading={loadingPins || loadingGroups || loadingLocalData}
      searchBarPlaceholder="Search pins..."
      filtering={{ keepSectionOrder: true }}
      onSelectionChange={(pinID) => selectedPinID != pinID && setSelectedPinID(pinID)}
      isShowingDetail={pinsWithNotes.includes(selectedPinID || "")}
      searchBarAccessory={
        tagNames.length > 0 ? (
          <List.Dropdown tooltip="Filter by Tag" isLoading={loadingPins} onChange={setFilteredTag}>
            <List.Dropdown.Item title="All Tags" value="all" icon={Icon.Tag} />
            {tagNames.map((tag) => (
              <List.Dropdown.Item
                title={`${tag} (${tagCounts[tag]} ${pluralize("pin", tagCounts[tag])})`}
                value={tag}
                icon={Icon.Tag}
              />
            ))}
          </List.Dropdown>
        ) : null
      }
      actions={
        <ActionPanel>
          <CreateNewPinAction setPins={setPins} />
          {!examplesInstalled || pins.length == 0 ? (
            <InstallExamplesAction
              setExamplesInstalled={setExamplesInstalled}
              revalidatePins={revalidatePins}
              revalidateGroups={revalidateGroups}
              kind="pins"
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
            {getPinListItems(
              pins.filter(
                (pin) =>
                  (filteredTag === "all" || pin.tags?.some((tag) => tag === filteredTag)) && pin.group == group.name,
              ),
            )}
          </List.Section>
        ) : (
          getPinListItems(
            pins.filter(
              (pin) =>
                (filteredTag === "all" || pin.tags?.some((tag) => tag === filteredTag)) && pin.group == group.name,
            ),
          )
        ),
      )}

      <RecentApplicationsList
        pinActions={
          <>
            <CreateNewPinAction setPins={setPins} />
            {!examplesInstalled || pins.length == 0 ? (
              <InstallExamplesAction
                setExamplesInstalled={setExamplesInstalled}
                revalidatePins={revalidatePins}
                revalidateGroups={revalidateGroups}
                kind="pins"
              />
            ) : null}
          </>
        }
      />
    </List>
  );
}
