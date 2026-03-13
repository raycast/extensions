import { useEffect, useState } from "react";
import {
  Icon,
  List,
  ActionPanel,
  getPreferenceValues,
  LocalStorage,
  closeMainWindow,
  PopToRootType,
} from "@raycast/api";
import { pluralize } from "./lib/utils";
import { ExtensionPreferences } from "./lib/preferences";
import { PinForm } from "./components/PinForm";
import { PinAction, StorageKey, Visibility } from "./lib/constants";
import { Pin, checkExpirations, getLastOpenedPin, openPin, sortPins, usePins } from "./lib/Pins";
import { Group, useGroups } from "./lib/Groups";
import RecentApplicationsList from "./components/RecentApplicationsList";
import { InstallExamplesAction } from "./components/actions/InstallExamplesAction";
import { ViewPinsPreferences } from "./lib/preferences";
import { useLocalData } from "./lib/LocalData";
import PinListItem from "./components/PinListItem";
import CreateNewPinAction from "./components/actions/CreateNewPinAction";

/**
 * Raycast command to view all pins in a list within the Raycast window.
 */
export default function ViewPinsCommand(args: { launchContext?: { pinID?: number; action?: PinAction } }) {
  const { pins, setPins, loadingPins, revalidatePins } = usePins();
  const { groups, loadingGroups, revalidateGroups } = useGroups();
  const [examplesInstalled, setExamplesInstalled] = useState<boolean>(true);
  const preferences = getPreferenceValues<ExtensionPreferences & ViewPinsPreferences>();
  const { localData, loadingLocalData } = useLocalData();
  const [selectedPinID, setSelectedPinID] = useState<string | null>(null);
  const [filteredTag, setFilteredTag] = useState<string>("all");
  const [showingHidden, setShowingHidden] = useState<boolean>(false);

  useEffect(() => {
    Promise.resolve(LocalStorage.getItem(StorageKey.EXAMPLE_PINS_INSTALLED)).then((examplesInstalled) => {
      setExamplesInstalled(examplesInstalled === 1);
    });
    Promise.resolve(checkExpirations());

    if (args.launchContext?.pinID) {
      const pin = pins.find((pin) => pin.id == args.launchContext?.pinID);
      if (pin) {
        if (args.launchContext.action === PinAction.OPEN) {
          Promise.resolve(openPin(pin, preferences, localData as unknown as { [key: string]: unknown }));
          closeMainWindow({ popToRootType: PopToRootType.Immediate });
        }
      }
    }
  }, []);

  if (args.launchContext?.pinID) {
    const pin = pins.find((pin) => pin.id == args.launchContext?.pinID);
    if (pin && args.launchContext.action !== PinAction.OPEN) {
      return <PinForm pin={pin} setPins={setPins} pins={pins} />;
    }
  }

  const maxTimesOpened = Math.max(...pins.map((pin) => pin.timesOpened || 0));
  const lastOpenedPin = getLastOpenedPin(pins);

  /**
   * Gets the list of pins as a list of ListItems.
   * @param pins The list of pins.
   * @returns A list of ListItems.
   */
  const getPinListItems = (pins: Pin[]) => {
    const visiblePins = pins.filter((pin) =>
      showingHidden
        ? true
        : pin.visibility === Visibility.USE_PARENT ||
          pin.visibility === Visibility.VISIBLE ||
          pin.visibility === Visibility.VIEW_PINS_ONLY ||
          pin.visibility === undefined,
    );
    return sortPins(pins, groups)
      .filter((pin) => {
        if (showingHidden) return true;
        return (
          pin.visibility === undefined ||
          pin.visibility === Visibility.USE_PARENT ||
          pin.visibility === Visibility.VISIBLE ||
          pin.visibility === Visibility.VIEW_PINS_ONLY
        );
      })
      .map((pin, index) => {
        return (
          <PinListItem
            key={pin.id}
            index={index}
            pin={pin}
            visiblePins={visiblePins}
            pins={pins}
            setPins={setPins}
            revalidatePins={revalidatePins}
            groups={groups}
            revalidateGroups={revalidateGroups}
            maxTimesOpened={maxTimesOpened}
            lastOpenedPin={lastOpenedPin}
            showingHidden={showingHidden}
            setShowingHidden={setShowingHidden}
            localData={localData}
            preferences={preferences}
            examplesInstalled={examplesInstalled}
            setExamplesInstalled={setExamplesInstalled}
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
                key={tag}
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
      {[{ name: "None", icon: "Minus", id: -1 } as Group].concat(groups).map((group) =>
        preferences.showGroups ? (
          group.visibility === Visibility.HIDDEN || group.visibility === Visibility.MENUBAR_ONLY ? (
            getPinListItems(
              pins.filter(
                (pin) =>
                  (filteredTag === "all" || pin.tags?.some((tag) => tag === filteredTag)) &&
                  pin.group == group.name &&
                  pin.visibility !== Visibility.USE_PARENT &&
                  pin.visibility !== undefined,
              ),
            )
          ) : (
            <List.Section title={group.name == "None" ? "Other" : group.name} key={group.id}>
              {getPinListItems(
                pins.filter(
                  (pin) =>
                    (filteredTag === "all" || pin.tags?.some((tag) => tag === filteredTag)) && pin.group == group.name,
                ),
              )}
            </List.Section>
          )
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
