/**
 * @module lib/accessories.ts A collection of functions for managing accessories on list items.
 *
 * @summary List item accessory utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-03 08:28:07
 * Last modified  : 2023-09-03 13:43:49
 */

import path from "path";

import { Color, Icon, List } from "@raycast/api";

import { SORT_STRATEGY } from "./constants";
import { Group } from "./Groups";
import { Pin } from "./Pins";

/**
 * Maps an amount to a color, based on the maximum amount, hinting at relative intensity.
 * @param amount The amount to map to a color.
 * @param maxAmount The maximum amount.
 * @returns A color.
 */
export const mapAmountToColor = (amount: number, maxAmount: number) => {
  const colors = [Color.Red, Color.Orange, Color.Yellow, Color.Green, Color.Blue, Color.Purple];
  const index = Math.floor((amount / maxAmount) * (colors.length - 1));
  return colors[index % colors.length];
};

/**
 * Adds a frequency accessory to the given list of accessories.
 * @param pin The pin to add the accessory for.
 * @param accessories The list of accessories to add the frequency accessory to.
 * @param maxFrequency The maximum number of times any pin has been opened.
 */
export const addFrequencyAccessory = (pin: Pin, accessories: List.Item.Accessory[], maxFrequency: number) => {
  if (pin.timesOpened) {
    accessories.push({
      tag: { value: pin.timesOpened.toString(), color: mapAmountToColor(pin.timesOpened, maxFrequency) },
      tooltip: `Opened ${pin.timesOpened} Time${pin.timesOpened == 1 ? "" : "s"}`,
    });
  }
};

/**
 * Adds a recency accessory to the given list of accessories, indicating when exactly the pin was last opened.
 * @param pin The pin to add the accessory for.
 * @param accessories The list of accessories to add the recency accessory to.
 * @param mostRecentPinID The ID of the most recently opened pin.
 */
export const addLastOpenedAccessory = (pin: Pin, accessories: List.Item.Accessory[], mostRecentPinID?: number) => {
  if (pin.lastOpened && pin.id == mostRecentPinID) {
    accessories.push({ icon: Icon.Clock, tooltip: `Last Opened ${new Date(pin.lastOpened).toLocaleString()}` });
  }
};

/**
 * Adds a creation date accessory to the given list of accessories, indicating when exactly the pin was created.
 * @param pin The pin to add the accessory for.
 * @param accessories The list of accessories to add the creation date accessory to.
 */
export const addCreationDateAccessory = (pin: Pin, accessories: List.Item.Accessory[]) => {
  if (pin.dateCreated) {
    accessories.push({ icon: Icon.Calendar, tooltip: `Created On ${new Date(pin.dateCreated).toLocaleString()}` });
  }
};

/**
 * Adds an expiration date accessory to the given list of accessories, indicating when exactly the pin will expire.
 * @param pin The pin to add the accessory for.
 * @param accessories The list of accessories to add the expiration date accessory to.
 */
export const addExpirationDateAccessory = (pin: Pin, accessories: List.Item.Accessory[]) => {
  if (pin.expireDate) {
    const expirationDate = new Date(pin.expireDate);
    const dateString = expirationDate.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    accessories.push({ date: expirationDate, tooltip: `Expires On ${dateString}` });
  }
};

/**
 * Adds an application accessory to the given list of accessories, indicating which application the pin will open with. If the pin is a terminal command, the terminal icon is added instead.
 * @param pin The pin to add the accessory for.
 * @param accessories The list of accessories to add the application accessory to.
 */
export const addApplicationAccessory = (pin: Pin, accessories: List.Item.Accessory[]) => {
  if (pin.application != "None" && pin.application != undefined) {
    accessories.push({
      icon: { fileIcon: pin.application },
      tooltip: `Opens With ${path.basename(pin.application, ".app")}`,
    });
  } else if (
    !pin.fragment &&
    !pin.url?.startsWith("/") &&
    !pin.url?.startsWith("~") &&
    !pin.url?.match(/^[a-zA-Z0-9]*?:.*/g)
  ) {
    accessories.push({ icon: Icon.Terminal, tooltip: "Runs Terminal Command" });
  }
};

/**
 * Adds an execution visibility accessory to the given list of accessories, indicating whether the pin will execute in the background or in a new terminal tab.
 * @param pin The pin to add the accessory for.
 * @param accessories The list of accessories to add the execution visibility accessory to.
 */
export const addExecutionVisibilityAccessory = (pin: Pin, accessories: List.Item.Accessory[]) => {
  if (
    !pin.fragment &&
    !pin.url?.startsWith("/") &&
    !pin.url?.startsWith("~") &&
    !pin.url?.match(/^[a-zA-Z0-9]*?:.*/g)
  ) {
    accessories.push({
      icon: pin.execInBackground ? Icon.EyeDisabled : Icon.Eye,
      tooltip: pin.execInBackground ? "Executes in Background" : "Executes In New Terminal Tab",
    });
  }
};

/**
 * Adds a text fragment accessory to the given list of accessories, indicating that the pin will copy raw text to the clipboard.
 * @param pin The pin to add the accessory for.
 * @param accessories The list of accessories to add the text fragment accessory to.
 */
export const addTextFragmentAccessory = (pin: Pin, accessories: List.Item.Accessory[]) => {
  if (pin.fragment) {
    accessories.push({ icon: Icon.Text, tooltip: "Text Fragment" });
  }
};

/**
 * Adds a sorting strategy accessory to the given list of accessories, indicating how a group is sorted.
 * @param group The group to add the accessory for.
 * @param accessories The list of accessories to add the sorting strategy accessory to.
 */
export const addSortingStrategyAccessory = (group: Group, accessories: List.Item.Accessory[]) => {
  accessories.push({ tag: { value: SORT_STRATEGY[group.sortStrategy || "Not Set"], color: Color.SecondaryText } });
};

/**
 * Adds an ID accessory tag to the given list of accessories.
 * @param group The group to add the accessory for.
 * @param accessories The list of accessories to add the ID accessory to.
 * @param maxID The maximum ID of any group.
 */
export const addIDAccessory = (group: Group, accessories: List.Item.Accessory[], maxID: number) => {
  accessories.push({ tag: { value: `ID: ${group.id.toString()}`, color: mapAmountToColor(group.id, maxID) } });
};

/**
 * Adds a parent group accessory tag to the given list of accessories.
 * @param group The group to add the accessory for.
 * @param accessories The list of accessories to add the parent group accessory to.
 */
export const addParentGroupAccessory = (group: Group, accessories: List.Item.Accessory[], groups: Group[]) => {
  if (group.parent != undefined) {
    const parentName = groups.find((g) => g.id == group.parent)?.name;
    accessories.push({ tag: { value: `Parent: ${parentName}`, color: Color.SecondaryText } });
  }
};
