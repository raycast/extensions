/**
 * @module lib/pins.ts A collection of functions for managing pins. This includes creating, modifying, and deleting pins, as well as getting the next available pin ID.
 *
 * @summary Pin utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:37:42
 * Last modified  : 2024-04-23 00:47:05
 */

import { useCachedState } from "@raycast/utils";
import {
  Alert,
  Application,
  Clipboard,
  Keyboard,
  LaunchType,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { SORT_FN, StorageKey, SORT_STRATEGY, Visibility, PinAction } from "./constants";
import { objectFromNonNullableEntriesOfObject, runCommand, runCommandInTerminal } from "./utils";
import { ExtensionPreferences } from "./preferences";
import * as fs from "fs";
import * as os from "os";
import path from "path";
import { Group } from "./Groups";
import { PLApplicator } from "placeholders-toolkit";
import PinsPlaceholders from "./placeholders";
import { getStorage, setStorage } from "./storage";
import { FileRef, TrackRef } from "./LocalData";

/**
 * A pin object.
 */
export type Pin = {
  /**
   * The name of the pin. This should generally be unique.
   */
  name: string;

  /**
   * The target URL or Terminal command to run when the pin is opened.
   */
  url: string;

  /**
   * A reference to the icon for the pin, either a valid Raycast icon, a URL, a file path, or an empty icon placeholder.
   */
  icon: string;

  /**
   * The name of the group that the pin belongs to, or "None" if the pin is not in a group.
   */
  group: string;

  /**
   * The unique ID of the pin.
   */
  id: number;

  /**
   * The application to open the pin in.
   */
  application: string;

  /**
   * The date that the pin expires and will be automatically removed. If undefined, the pin will never expire.
   */
  expireDate?: string;

  /**
   * Whether to treat the pin's target as a text fragment, regardless of its contents.
   */
  fragment?: boolean;

  /**
   * Whether or not the pin's target should be executed in the background. Only applies to pins with a Terminal command target.
   */
  execInBackground?: boolean;

  /**
   * The keyboard shortcut to open/execute the pin.
   */
  shortcut?: Keyboard.Shortcut;

  /**
   * The date that the pin was last opened.
   */
  lastOpened?: string;

  /**
   * The number of times that the pin has been opened.
   */
  timesOpened?: number;

  /**
   * The date that the pin was initially created.
   */
  dateCreated?: string;

  /**
   * The color of the icon. Only applies to built-in Raycast icons.
   */
  iconColor?: string;

  /**
   * The average time, in milliseconds, for every execution of the pin.
   */
  averageExecutionTime?: number;

  /**
   * The tags associated with the pin.
   */
  tags?: string[];

  /**
   * User-defined notes for the pin.
   */
  notes?: string;

  /**
   * The tooltip to display when hovering over the pin.
   */
  tooltip?: string;

  /**
   * Where the pin is visible in the UI, if at all.
   */
  visibility?: Visibility;

  /**
   * The action to take when the pin expires.
   */
  expirationAction?: string;
};

/**
 * The keys of a {@link Pin} object.
 */
export const PinKeys = [
  "name",
  "url",
  "icon",
  "group",
  "id",
  "application",
  "expireDate",
  "fragment",
  "execInBackground",
  "shortcut",
  "lastOpened",
  "timesOpened",
  "dateCreated",
  "iconColor",
  "averageExecutionTime",
  "tags",
  "notes",
  "tooltip",
  "visibility",
  "expirationAction",
];

/**
 * Removes expired pins.
 */
export const checkExpirations = async () => {
  const storedPins = (await getStorage(StorageKey.LOCAL_PINS)) as Pin[];
  let numRemoved = 0;
  let numHidden = 0;
  let numDisabled = 0;
  const customActionPins: Pin[] = [];
  const newPins = await Promise.all(
    storedPins
      .filter((pin: Pin) => {
        if (pin.expireDate) {
          if (new Date(pin.expireDate) < new Date()) {
            if (pin.expirationAction === PinAction.DELETE || pin.expirationAction == undefined) {
              numRemoved++;
              return false;
            } else if (pin.expirationAction == PinAction.HIDE) {
              numHidden++;
            } else if (pin.expirationAction == PinAction.DISABLE) {
              numDisabled++;
            } else if (pin.expirationAction?.startsWith("custom")) {
              customActionPins.push(pin);
            }
          }
        }
        return true;
      })
      .map(async (pin: Pin) => {
        if (pin.expireDate && new Date(pin.expireDate) < new Date()) {
          let newVisibility = pin.visibility;
          if (pin.expirationAction == PinAction.HIDE) {
            newVisibility = Visibility.HIDDEN;
          } else if (pin.expirationAction == PinAction.DISABLE) {
            newVisibility = Visibility.DISABLED;
          }

          return {
            ...pin,
            expireDate: undefined,
            visibility: newVisibility,
          };
        }
        return pin;
      }),
  );

  let message = "";
  if (numRemoved > 0) {
    message = `Removed ${numRemoved} expired pin${numRemoved == 1 ? "" : "s"}`;
  }

  if (numHidden > 0) {
    if (numRemoved > 0) {
      message += `, hid ${numHidden} pin${numHidden == 1 ? "" : "s"}`;
    } else {
      message += `Hid ${numHidden} pin${numHidden == 1 ? "" : "s"}`;
    }
  }

  if (numDisabled > 0) {
    if ((numRemoved > 0 && numHidden == 0) || (numRemoved == 0 && numHidden > 0)) {
      message += `, disabled ${numDisabled} pin${numDisabled == 1 ? "" : "s"}`;
    } else if (numRemoved > 0 && numHidden > 0) {
      message += `, and disabled ${numDisabled} pin${numDisabled == 1 ? "" : "s"}`;
    } else {
      message += `Disabled ${numDisabled} pin${numDisabled == 1 ? "" : "s"}`;
    }
  }

  if (customActionPins.length > 0) {
    const numCustom = customActionPins.length;
    if ((numRemoved > 0 || numHidden > 0 || numDisabled > 0) && numCustom > 0) {
      message += `. Ran custom expiration actions for ${numCustom} pin${numCustom == 1 ? "" : "s"}.`;
    } else {
      message += `Ran custom expiration actions for ${numCustom} pin${numCustom == 1 ? "" : "s"}`;
    }
  }

  if (message != "") {
    if (environment.launchType == LaunchType.Background) {
      showHUD(message);
    } else {
      showToast({ title: message });
    }
  }

  await setStorage(StorageKey.LOCAL_PINS, newPins);

  for (const pin of customActionPins) {
    if (pin.expirationAction) {
      // Run any placeholder directives in the expiration action
      await PLApplicator.bulkApply(pin.expirationAction, {
        context: {
          pin: pin,
        },
        allPlaceholders: PinsPlaceholders,
      });
    }
  }
};

/**
 * Gets the stored pins.
 * @returns The list of pin objects.
 */
export const getPins = async () => {
  return await getStorage(StorageKey.LOCAL_PINS);
};

/**
 * Gets the stored pins.
 * @returns The list of pins alongside an update function.
 */
export const usePins = () => {
  const [pins, setPins] = useCachedState<Pin[]>("pins", []);
  const [loading, setLoading] = useState<boolean>(true);

  const revalidatePins = async () => {
    setLoading(true);
    const storedPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);

    const checkedPins: Pin[] = [];
    for (const pin of storedPins) {
      checkedPins.push({
        ...pin,
        group: pin.group == undefined ? "None" : pin.group,
        id: pin.id == undefined ? await getNextPinID() : pin.id,
      });
    }
    setPins(checkedPins);
    setLoading(false);
  };

  useEffect(() => {
    revalidatePins();
  }, []);

  return {
    pins: pins,
    setPins: setPins,
    loadingPins: loading,
    revalidatePins: revalidatePins,
  };
};

/**
 * Opens a pin.
 * @param pin The pin to open.
 * @param preferences The extension preferences object.
 */
export const openPin = async (
  pin: Pin,
  preferences: { preferredBrowser: Application },
  context?: { [key: string]: unknown },
) => {
  const startDate = new Date();
  try {
    if (pin.fragment) {
      // Copy the text fragment to the clipboard
      await Clipboard.copy(pin.url);

      if (environment.commandName == "index") {
        await showHUD("Copied To Clipboard");
      } else {
        await showToast({ title: "Copied To Clipboard" });
      }
      await setStorage(StorageKey.LAST_OPENED_PIN, pin.id);
    } else {
      // Convert LocalData objects to strings
      const filteredContext = objectFromNonNullableEntriesOfObject(context || {});
      if (filteredContext["selectedFiles"]) {
        filteredContext["selectedFiles"] = Object.values(filteredContext["selectedFiles"])
          .map((file: FileRef) => file.path)
          .join(", ");
      }

      if (filteredContext["currentDirectory"]) {
        filteredContext["currentDirectory"] = (filteredContext["currentDirectory"] as FileRef).path;
      }

      if (filteredContext["currentTrack"]) {
        const track = filteredContext["currentTrack"] as TrackRef;
        if (track.name.length > 0) {
          filteredContext["currentTrack"] = `${(filteredContext["currentTrack"] as TrackRef).name} by ${
            (filteredContext["currentTrack"] as TrackRef).artist
          }`;
        } else {
          filteredContext["currentTrack"] = undefined;
        }
      }

      const targetRaw = pin.url.startsWith("~") ? pin.url.replace("~", os.homedir()) : pin.url;
      const target = await PLApplicator.bulkApply(targetRaw, {
        context: { ...filteredContext, pin: pin },
        allPlaceholders: PinsPlaceholders,
      });
      if (target != "") {
        const isPath = pin.url.startsWith("/") || pin.url.startsWith("~");
        const targetApplication = !pin.application || pin.application == "None" ? undefined : pin.application;
        if (isPath) {
          // Open the path in the target application (fallback to default application for the file type)
          if (fs.existsSync(target)) {
            await open(path.resolve(target), targetApplication);
            await setStorage(StorageKey.LAST_OPENED_PIN, pin.id);
          } else {
            throw new Error("File does not exist.");
          }
        } else {
          if (target.match(/^[a-zA-Z](?![%])[a-zA-Z0-9+.-]+?:.*/g)) {
            // Open the URL in the target application (fallback to preferred browser, then default browser)
            await open(encodeURI(target), targetApplication || preferences.preferredBrowser);
            await setStorage(StorageKey.LAST_OPENED_PIN, pin.id);
          } else {
            // Open Terminal command in the default Terminal application
            await setStorage(StorageKey.LAST_OPENED_PIN, pin.id);
            if (pin.execInBackground) {
              // Run the Terminal command in the background
              await runCommand(target);
            } else {
              // Run the Terminal command in a new Terminal tab
              await runCommandInTerminal(target);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
    if (environment.commandName == "view-pins") {
      await showToast({
        title: "Failed to open " + (pin.name || (pin.url.length > 20 ? pin.url.substring(0, 19) + "..." : pin.url)),
        message: (error as Error).message,
        style: Toast.Style.Failure,
      });
    } else {
      await showHUD(`Failed to open ${pin.name || pin.url}: ${(error as Error).message}`);
    }
  }

  const endDate = new Date();
  const timeElapsed = endDate.getTime() - startDate.getTime();
  await modifyPin(
    pin,
    pin.name,
    pin.url,
    pin.icon,
    pin.group,
    pin.application,
    pin.expireDate ? new Date(pin.expireDate) : undefined,
    pin.execInBackground,
    pin.fragment,
    pin.shortcut,
    new Date(),
    (pin.timesOpened || 0) + 1,
    pin.dateCreated ? new Date(pin.dateCreated) : new Date(),
    pin.iconColor,
    pin.tags,
    pin.notes,
    pin.tooltip,
    pin.averageExecutionTime
      ? Math.round((pin.averageExecutionTime * (pin.timesOpened || 0) + timeElapsed) / ((pin.timesOpened || 0) + 1))
      : timeElapsed,
    pin.visibility,
    pin.expirationAction,
    () => {
      null;
    },
    () => {
      null;
    },
    false,
  );
};

/**
 * Gets the next available pin ID.
 */
export const getNextPinID = async () => {
  // Get the stored pins
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);

  // Get the next available group ID
  let newID = (await getStorage(StorageKey.NEXT_PIN_ID))[0] || 1;
  while (storedPins.some((pin: Group) => pin.id == newID)) {
    newID++;
  }
  setStorage(StorageKey.NEXT_PIN_ID, [newID + 1]);
  return newID;
};

/**
 * Creates a new pin; updates local storage.
 * @param name The name of the pin.
 * @param target The URL, path, or Terminal command to pin.
 * @param icon The icon for the pin.
 * @param group The group the pin belongs to.
 * @param application The application to open the pin in.
 * @param expireDate The date the pin expires.
 * @param execInBackground Whether to run the specified command, if any, in the background.
 * @param fragment Whether to treat the pin's target as a text fragment, regardless of its contents.
 * @param shortcut The keyboard shortcut to open/execute the pin.
 * @param iconColor The color of the icon.
 * @param tags The tags associated with the pin.
 * @param notes User-defined notes for the pin.
 * @returns The ID of the new pin.
 */
export const createNewPin = async (
  name: string,
  target: string,
  icon: string,
  group: string,
  application: string,
  expireDate: Date | undefined,
  execInBackground: boolean | undefined,
  fragment: boolean | undefined,
  shortcut: Keyboard.Shortcut | undefined,
  iconColor: string | undefined,
  tags: string[] | undefined,
  notes: string | undefined,
  visibility?: Visibility | undefined,
  expireAction?: string | undefined,
) => {
  // Get the stored pins
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);

  // Get the next available pin ID
  let newID = (await getStorage(StorageKey.NEXT_PIN_ID))[0] || 1;
  while (storedPins.some((pin: Pin) => pin.id == newID)) {
    newID++;
  }
  await setStorage(StorageKey.NEXT_PIN_ID, [newID + 1]);

  // Add the new pin to the list of stored pins
  const newData = [...storedPins];
  newData.push({
    name: name,
    url: target,
    icon: icon,
    group: group,
    id: newID,
    application: application,
    expireDate: expireDate?.toUTCString(),
    execInBackground: execInBackground,
    fragment: fragment,
    shortcut: shortcut,
    dateCreated: new Date().toUTCString(),
    iconColor: iconColor,
    tags: tags,
    notes: notes,
    visibility: visibility || Visibility.VISIBLE,
    expirationAction: expireAction || PinAction.DELETE,
  });

  // Update the stored pins
  await setStorage(StorageKey.LOCAL_PINS, newData);
  return newID;
};

/**
 * Updates a pin; updates local storage.
 * @param pin The pin to update.
 * @param name The new name of the pin.
 * @param url The new URL, path, or Terminal command to pin.
 * @param icon The new icon for the pin.
 * @param group The new group the pin belongs to.
 * @param application The new application to open the pin in.
 * @param expireDate The new date the pin expires.
 * @param execInBackground Whether to run the specified command, if any, in the background.
 * @param fragment Whether to treat the pin's target as a text fragment, regardless of its contents.
 * @param shortcut The new keyboard shortcut to open/execute the pin.
 * @param pop The function to close the pin editor.
 * @param setPins The function to update the list of pins.
 */
export const modifyPin = async (
  pin: Pin,
  name: string,
  url: string,
  icon: string,
  group: string,
  application: string,
  expireDate: Date | undefined,
  execInBackground: boolean | undefined,
  fragment: boolean | undefined,
  shortcut: Keyboard.Shortcut | undefined,
  lastOpened: Date | undefined,
  timesOpened: number | undefined,
  dateCreated: Date | undefined,
  iconColor: string | undefined,
  tags: string[] | undefined,
  notes: string | undefined,
  tooltip: string | undefined,
  averageExecutionTime: number | undefined,
  visibility: Visibility | undefined,
  expirationAction: string | undefined,
  pop: () => void,
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>,
  notify = true,
) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  const checkedPins: Pin[] = [];
  for (const pin of storedPins) {
    checkedPins.push({
      ...pin,
      group: pin.group == undefined ? "None" : pin.group,
      id: pin.id == undefined ? await getNextPinID() : pin.id,
    });
  }

  const newData: Pin[] = checkedPins.map((oldPin: Pin) => {
    // Update pin if it exists
    if (pin.id != -1 && oldPin.id == pin.id) {
      return {
        name: name,
        url: url,
        icon: icon,
        group: group,
        id: pin.id,
        application: application,
        expireDate: expireDate?.toUTCString(),
        execInBackground: execInBackground,
        fragment: fragment,
        shortcut: shortcut,
        lastOpened: lastOpened?.toUTCString(),
        timesOpened: timesOpened,
        dateCreated: dateCreated?.toUTCString(),
        iconColor: iconColor,
        tags: tags,
        notes: notes,
        tooltip: tooltip,
        averageExecutionTime: averageExecutionTime,
        visibility: visibility || Visibility.VISIBLE,
        expirationAction: expirationAction || PinAction.DELETE,
      } as Pin;
    } else {
      return oldPin;
    }
  });

  if (pin.id == -1) {
    pin.id = (await getStorage(StorageKey.NEXT_PIN_ID))[0] || 1;
    while (checkedPins.some((checkedPin: Pin) => checkedPin.id == pin.id)) {
      pin.id = pin.id + 1;
    }
    setStorage(StorageKey.NEXT_PIN_ID, [pin.id + 1]);

    // Add new pin if it doesn't exist
    newData.push({
      name: name,
      url: url,
      icon: icon,
      group: group,
      id: pin.id,
      application: application,
      expireDate: expireDate?.toUTCString(),
      execInBackground: execInBackground,
      fragment: fragment,
      shortcut: shortcut,
      lastOpened: lastOpened?.toUTCString(),
      timesOpened: timesOpened,
      dateCreated: dateCreated?.toUTCString(),
      iconColor: iconColor,
      tags: tags,
      notes: notes,
      tooltip: tooltip,
      averageExecutionTime: averageExecutionTime,
      visibility: visibility || Visibility.VISIBLE,
      expirationAction: expirationAction || PinAction.DELETE,
    });
  }

  setPins(newData);
  await setStorage(StorageKey.LOCAL_PINS, newData);

  if (notify) {
    await showToast({ title: `Updated pin!` });
  }
  pop();
};

export const setPinAttribute = async (
  pin: Pin,
  attribute: keyof Pin,
  value: Pin[keyof Pin],
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>,
) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  const newData: Pin[] = storedPins.map((oldPin: Pin) => {
    if (oldPin.id == pin.id) {
      return {
        ...oldPin,
        [attribute]: value,
      };
    }
    return oldPin;
  });

  setPins(newData);
  await setStorage(StorageKey.LOCAL_PINS, newData);
};

/**
 * Hides a pin; updates local storage.
 * @param pin The pin to hide.
 * @param setPins The function to update the list of pins.
 */
export const hidePin = async (pin: Pin, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) =>
  setPinAttribute(pin, "visibility", Visibility.HIDDEN, setPins);

/**
 * Unhides a pin; updates local storage.
 * @param pin The pin to unhide.
 * @param setPins The function to update the list of pins.
 */
export const unhidePin = async (pin: Pin, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) =>
  setPinAttribute(pin, "visibility", Visibility.VISIBLE, setPins);

/**
 * Disables a pin; updates local storage.
 * @param pin The pin to disable.
 * @param setPins The function to update the list of pins.
 */
export const disablePin = async (pin: Pin, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) =>
  setPinAttribute(pin, "visibility", Visibility.DISABLED, setPins);

/**
 * Moves a pin to the specified group; updates local storage.
 * @param pin The pin to enable.
 * @param setPins The function to update the list of pins.
 */
export const movePin = async (pin: Pin, group: string, setPins?: React.Dispatch<React.SetStateAction<Pin[]>>) =>
  setPinAttribute(pin, "group", group, setPins || (() => {}));

/**
 * Deletes a pin; updates local storage.
 * @param pin The pin to delete.
 * @param setPins The function to update the list of pins.
 */
export const deletePin = async (
  pin: Pin,
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>,
  showAlert = true,
  displayToast = true,
) => {
  if (
    !showAlert ||
    (await confirmAlert({
      title: `Delete Pin '${pin.name}'`,
      message: "Are you sure?",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    }))
  ) {
    const storedPins = await getStorage(StorageKey.LOCAL_PINS);

    const filteredPins = storedPins.filter((oldPin: Pin) => {
      return oldPin.id != pin.id;
    });

    setPins(filteredPins);
    await setStorage(StorageKey.LOCAL_PINS, filteredPins);
    if (displayToast) await showToast({ title: `Removed pin!` });
  }
};

/**
 * Gets the last opened pin.
 * @returns The {@link Pin} that was last opened.
 */
export const getPreviousPin = async (): Promise<Pin | undefined> => {
  const previousPin = await getStorage(StorageKey.LAST_OPENED_PIN);
  if (previousPin == undefined || parseInt(previousPin) == undefined) return undefined;
  const pins = await getStorage(StorageKey.LOCAL_PINS);
  return pins.find((pin: Pin) => pin.id == previousPin);
};

/**
 * Sorts pins according to extension-level and per-group sort strategy preferences.
 * @param pins The list of pins to sort.
 * @param groups The list of groups to sort by.
 * @returns The sorted list of pins.
 */
export const sortPins = (
  pins: Pin[],
  groups: Group[],
  sortMethod?: keyof typeof SORT_STRATEGY,
  sortFn?: (a: unknown, b: unknown) => number,
) => {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  return [...pins].sort((p1, p2) => {
    const group = groups.find((group) => group.name == p1.group);
    if (sortFn) {
      // Use custom sort function if provided
      return sortFn(p1, p2);
    }

    if (
      sortMethod == "alphabetical" ||
      (sortMethod == undefined &&
        (group?.sortStrategy == "alphabetical" || (!group && preferences.defaultSortStrategy == "alphabetical")))
    ) {
      return p1.name.localeCompare(p2.name);
    } else if (
      sortMethod == "frequency" ||
      (sortMethod == undefined &&
        (group?.sortStrategy == "frequency" || (!group && preferences.defaultSortStrategy == "frequency")))
    ) {
      return (p2.timesOpened || 0) - (p1.timesOpened || 0);
    } else if (
      sortMethod == "recency" ||
      (sortMethod == undefined &&
        (group?.sortStrategy == "recency" || (!group && preferences.defaultSortStrategy == "recency")))
    ) {
      return (p1.lastOpened ? new Date(p1.lastOpened) : new Date(0)).getTime() >
        (p2.lastOpened ? new Date(p2.lastOpened) : new Date(0)).getTime()
        ? -1
        : 1;
    } else if (
      sortMethod == "dateCreated" ||
      (sortMethod == undefined &&
        (group?.sortStrategy == "dateCreated" || (!group && preferences.defaultSortStrategy == "dateCreated")))
    ) {
      return (p1.dateCreated ? new Date(p1.dateCreated) : new Date(0)).getTime() >
        (p2.dateCreated ? new Date(p2.dateCreated) : new Date(0)).getTime()
        ? -1
        : 1;
    }
    return 0;
  });
};

/**
 * Gets the most recently opened pin.
 * @param pins The list of pins to search.
 * @returns The {@link Pin} that was most recently opened, or undefined if no pins have been created yet.
 */
export const getLastOpenedPin = (pins: Pin[]) => {
  const sortedPins = sortPins(pins, [], undefined, SORT_FN.LAST_OPENED);
  if (sortedPins.length > 0) {
    return sortedPins[0];
  }
  return undefined;
};

/**
 * Gets the most recently created pin.
 * @param pins The list of pins to search.
 * @returns The {@link Pin} that was most recently created, or undefined if no pins have been created yet.
 */
export const getNewestPin = (pins: Pin[]) => {
  const sortedPins = sortPins(pins, [], undefined, SORT_FN.NEWEST);
  if (sortedPins.length > 0) {
    return sortedPins[0];
  }
  return undefined;
};

/**
 * Gets the oldest pin (the pin with the earliest creation date).
 * @param pins The list of pins to search.
 * @returns The {@link Pin} that was created first, or undefined if no pins have been created yet.
 */
export const getOldestPin = (pins: Pin[]) => {
  const sortedPins = sortPins(pins, [], undefined, SORT_FN.OLDEST);
  if (sortedPins.length > 0) {
    return sortedPins[0];
  }
  return undefined;
};

/**
 * Gets the total number of times that all pins have been used.
 * @param pins The list of all pins.
 * @returns The total execution count.
 */
export const getTotalPinExecutions = (pins: Pin[]) => {
  return pins.reduce((total, pin) => total + (pin.timesOpened || 0), 0);
};

/**
 * Calculates the percentile of a pin's frequency compared to all other pins.
 * @param pin The pin to calculate the percentile for.
 * @param pins All pins to compare the pin to.
 * @returns The percentile of the pin's frequency compared to all other pins.
 */
export const calculatePinFrequencyPercentile = (pin: Pin, pins: Pin[]) => {
  const pinsSortedByFrequency = pins.sort((a, b) => (a.timesOpened || 0) - (b.timesOpened || 0));
  const pinIndex = pinsSortedByFrequency.findIndex(
    (p) => p.id == pin.id || (p.timesOpened || 0) >= (pin.timesOpened || 0),
  );
  return Math.round((pinIndex / (pinsSortedByFrequency.length - 1)) * 100);
};

/**
 * Calculates the percentile of a pin's execution time compared to all other pins.
 * @param pin The pin to calculate the percentile for.
 * @param pins All pins to compare the pin to.
 * @returns The percentile of the pin's execution time compared to all other pins.
 */
export const calculatePinExecutionTimePercentile = (pin: Pin, pins: Pin[]) => {
  const pinsSortedByExecutionTime = pins
    .filter((p) => p.averageExecutionTime != undefined)
    .sort((a, b) => (a.averageExecutionTime || 0) - (b.averageExecutionTime || 0));
  const pinIndex = pinsSortedByExecutionTime.findIndex(
    (p) => p.id == pin.id || (p.averageExecutionTime || 0) >= (pin.averageExecutionTime || 0),
  );
  return Math.round((1 - pinIndex / (pinsSortedByExecutionTime.length - 1)) * 100);
};

/**
 * Gets keywords for a given pin. Keywords are derived from the pin's name, group name, and URL/target.
 * @param pin The pin to get keywords for.
 * @returns The list of keywords.
 */
export const getPinKeywords = (pin: Pin) => {
  return [
    ...(pin.group == "None" ? "Other" : pin.group.split(" ")),
    ...pin.url
      .replaceAll(/([ /:.'"-])(.+?)(?=\b|[ /:.'"-])/gs, " $1 $1$2 $2")
      .split(" ")
      .filter((term) => term.trim().length > 0),
  ];
};

/**
 * Gets all pins and groups in JSON format.
 * @returns A promise resolving to the JSON object containing all pins and groups.
 */
export const getPinsJSON = async () => {
  const pins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
  const groups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
  const data = {
    groups: groups,
    pins: pins,
  };
  return data;
};

/**
 * Copies the pin data to the clipboard.
 * @returns A promise resolving to the JSON string of the pin data.
 */
export const copyPinData = async () => {
  const pins = await getStorage(StorageKey.LOCAL_PINS);
  const groups = await getStorage(StorageKey.LOCAL_GROUPS);

  const data = {
    groups: groups,
    pins: pins,
  };

  const jsonData = JSON.stringify(data);
  await Clipboard.copy(jsonData);
  return jsonData;
};

/**
 * Gets the pins that this pin links to.
 * @param pin The pin to get linked pins for.
 * @param pins The list of all pins.
 * @param groups The list of all groups.
 * @returns The list of pins that the given pin links to.
 */
export const getLinkedPins = (pin: Pin, pins: Pin[], groups: Group[]) => {
  const links: Pin[] = [];
  const pattern = /{{(launchPin|openPin|runPin):(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/g;
  let match;
  while ((match = pattern.exec(pin.url))) {
    const targetRep = match[2];
    const target = pins.find((p) => p.name == targetRep || p.id.toString() == targetRep);
    if (target) {
      links.push(target);
    }
  }

  const groupPattern = /{{(launchGroup|openGroup):(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/g;
  let groupMatch;
  while ((groupMatch = groupPattern.exec(pin.url))) {
    const targetRep = groupMatch[2];
    const targetGroup = groups.find((g) => g.name == targetRep || g.id.toString() == targetRep);
    if (targetGroup) {
      const groupPins = pins.filter((p) => p.group == targetGroup.name);
      links.push(...groupPins);
    }
  }
  return links;
};

/**
 * Gets the statistics (i.e. usage and creation info, not just raw stats) for a given pin as either a string (default) or an object. In string form, each statistic is separated by two newlines.
 *
 * @param pin The pin to get statistics for.
 * @param pins All pins to compare the pin to.
 * @param format The format to return the statistics in. Defaults to "string".
 * @returns The statistics for the pin.
 */
export const getPinStatistics = (pin: Pin, pins: Pin[], format: "string" | "object" = "string") => {
  const dateFormat: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  };

  const formattedDateCreated = pin.dateCreated
    ? new Date(pin.dateCreated).toLocaleDateString(undefined, dateFormat)
    : new Date().toLocaleDateString(undefined, dateFormat);

  const formattedDateLastOpened = pin.lastOpened
    ? new Date(pin.lastOpened).toLocaleDateString(undefined, dateFormat)
    : "Never";

  const percentOfAllExecutions = `${Math.round(((pin.timesOpened || 0) / getTotalPinExecutions(pins)) * 100)}%`;
  const averageExecutionTime = pin.averageExecutionTime ? `${pin.averageExecutionTime / 1000} seconds` : "N/A";

  const placeholdersUsed = PinsPlaceholders.filter((placeholder) => {
    return (
      pin.url.match(new RegExp(placeholder.regex, "g")) != null ||
      pin.url.match(new RegExp(`(?<![a-zA-z])${placeholder.name.replaceAll("+", "\\+")}(?! ?[a-zA-z])`)) != undefined
    );
  });
  const placeholdersSummary = `${
    placeholdersUsed.length > 0
      ? `${placeholdersUsed.length} (${placeholdersUsed.map((placeholder) => placeholder.name).join(", ")})`
      : `None`
  }`;

  if (format == "object") {
    return {
      dateCreated: formattedDateCreated,
      isNewestPin: getNewestPin(pins)?.id == pin.id,
      timesUsed: pin?.timesOpened || 0,
      percentOfAllExecutions: percentOfAllExecutions,
      isOldestPin: getOldestPin(pins)?.id == pin.id,
      frequencyPercentile: `${calculatePinFrequencyPercentile(pin, pins)}%`,
      lastUsed: formattedDateLastOpened,
      isMostRecent: getLastOpenedPin(pins)?.id == pin.id,
      placeholdersUsed: placeholdersSummary,
      averageExecutionTime: averageExecutionTime,
      executionTimePercentile: `${calculatePinExecutionTimePercentile(pin, pins)}%`,
    };
  }

  const newestPinText = getNewestPin(pins)?.id == pin.id ? ` (Newest Pin)` : ``;
  const oldestPinText = getOldestPin(pins)?.id == pin.id ? ` (Oldest Pin)` : ``;
  const dateCreatedText = `Date Created: ${formattedDateCreated}${newestPinText}${oldestPinText}`;

  const mostRecentText = getLastOpenedPin(pins)?.id == pin.id ? ` (Most Recent)` : ``;
  const lastUsedText = `Last Used: ${pin.lastOpened ? `${formattedDateLastOpened}${mostRecentText}` : "Never"}`;

  const frequencyPercentile = calculatePinFrequencyPercentile(pin, pins);
  const timesUsedText = `Times Used: ${
    pin?.timesOpened
      ? `${pin.timesOpened} ${
          frequencyPercentile > 0
            ? frequencyPercentile === 100
              ? `(Most Used Pin)`
              : `(More than ${frequencyPercentile}% of Other Pins)`
            : `(Least Used Pin)`
        }`
      : 0
  }`;

  const percentOfAllExecutionsText = `${
    percentOfAllExecutions == "NaN%" ? "0%" : percentOfAllExecutions
  } of All Pin Executions`;

  const executionTimePercentile = calculatePinExecutionTimePercentile(pin, pins);
  const averageExecutionTimeText = `Average Execution Time: ${averageExecutionTime}${
    executionTimePercentile > 0
      ? executionTimePercentile === 100
        ? ` (Fastest Pin)`
        : ` (Faster than ${executionTimePercentile}% of Other Pins)`
      : ` (Slowest Pin)`
  }`;

  const placeholdersUsedText = `Placeholders Used: ${placeholdersSummary}`;

  return [dateCreatedText, lastUsedText, timesUsedText, percentOfAllExecutionsText]
    .concat(pin.averageExecutionTime ? [averageExecutionTimeText, placeholdersUsedText] : [placeholdersUsedText])
    .join("\n\n");
};
