import { useCachedState } from "@raycast/utils";
import { LaunchType, Toast, confirmAlert, environment, open, showHUD, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { StorageKey } from "./constants";
import { getStorage, runCommand, runCommandInTerminal, setStorage } from "./utils";
import * as fs from "fs";
import * as os from "os";
import { Placeholders } from "./placeholders";
import path from "path";

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
   * Whether or not the pin's target should be executed in the background. Only applies to pins with a Terminal command target.
   */
  execInBackground?: boolean;
};

/**
 * Removes expired pins.
 */
export const checkExpirations = async () => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  let numExpired = 0;
  const newPins = storedPins.filter((pin: Pin) => {
    if (pin.expireDate) {
      if (new Date(pin.expireDate) < new Date()) {
        numExpired++;
        return false;
      }
    }
    return true;
  });
  if (numExpired > 0) {
    if (environment.launchType == LaunchType.Background) {
      await showHUD(`Removed ${numExpired} expired pin${numExpired == 1 ? "" : "s"}`);
    } else {
      await showToast({ title: `Removed ${numExpired} expired pin${numExpired == 1 ? "" : "s"}` });
    }
  }
  await setStorage(StorageKey.LOCAL_PINS, newPins);
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
    setPins(storedPins);
    setLoading(false);
  };

  useEffect(() => {
    Promise.resolve(revalidatePins());
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
export const openPin = async (pin: Pin, preferences: { preferredBrowser: string }) => {
  try {
    const targetRaw = pin.url.startsWith("~") ? pin.url.replace("~", os.homedir()) : pin.url;
    const target = await Placeholders.applyToString(targetRaw);
    if (target == "") return;

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
      if (target.match(/[a-zA-Z0-9]+?:.*/g)) {
        // Open the URL in the target application (fallback to preferred browser, then default browser)
        await open(encodeURI(target), targetApplication || preferences.preferredBrowser);
        await setStorage(StorageKey.LAST_OPENED_PIN, pin.id);
      } else {
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
  } catch (error) {
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
 */
export const createNewPin = async (
  name: string,
  target: string,
  icon: string,
  group: string,
  application: string,
  expireDate: Date | undefined,
  execInBackground: boolean | undefined
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
  });

  // Update the stored pins
  await setStorage(StorageKey.LOCAL_PINS, newData);
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
  pop: () => void,
  setPins: React.Dispatch<React.SetStateAction<Pin[]>>
) => {
  const storedPins = await getStorage(StorageKey.LOCAL_PINS);
  const newData: Pin[] = storedPins.map((oldPin: Pin) => {
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
      };
    } else {
      return oldPin;
    }
  });

  if (pin.id == -1) {
    pin.id = (await getStorage(StorageKey.NEXT_PIN_ID))[0] || 1;
    while (storedPins.some((storedPin: Pin) => storedPin.id == pin.id)) {
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
    });
  }

  setPins(newData);
  await setStorage(StorageKey.LOCAL_PINS, newData);
  await showToast({ title: `Updated pin!` });
  pop();
};

/**
 * Deletes a pin; updates local storage.
 * @param pin The pin to delete.
 * @param setPins The function to update the list of pins.
 */
export const deletePin = async (pin: Pin, setPins: React.Dispatch<React.SetStateAction<Pin[]>>) => {
  if (await confirmAlert({ title: "Are you sure?" })) {
    const storedPins = await getStorage(StorageKey.LOCAL_PINS);

    const filteredPins = storedPins.filter((oldPin: Pin) => {
      return oldPin.id != pin.id;
    });

    setPins(filteredPins);
    await setStorage(StorageKey.LOCAL_PINS, filteredPins);
    await showToast({ title: `Removed pin!` });
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
