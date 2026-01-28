/**
 * @module lib/accessories.ts A collection of functions for managing accessories on list items.
 *
 * @summary List item accessory utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-03 08:28:07
 * Last modified  : 2024-07-05 01:57:20
 */

import path from "path";

import { Color, Icon, List } from "@raycast/api";

import { SORT_STRATEGY, Visibility } from "./constants";
import { Group, isGroup } from "./Groups";
import { getLinkedPins, Pin } from "./Pins";
import { pluralize } from "./utils";
import PinsPlaceholders from "./placeholders";

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
 * Adds a tag accessory for each tag associated with the pin to the given list of accessories.
 * @param pin The pin to add the accessory for.
 * @param accessories The list of accessories to add the tag accessories to.
 */
export const addTagAccessories = (pin: Pin, accessories: List.Item.Accessory[]) => {
  const tagAccessories = pin.tags?.map((tag) => ({
    tag: { value: tag, color: Color.SecondaryText },
    tooltip: `Tagged '${tag}'`,
  }));
  accessories.push(...(tagAccessories || []));
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
      icon: Icon.PlayFilled,
    });
  }
};

/**
 * Adds an accessory indicating the number of linked pins to the given list of accessories.
 * @param pin The pin to add the accessory for.
 * @param accessories The list of accessories to add the link accessory to.
 * @param pins The list of all pins.
 * @param groups The list of all groups.
 */
export const addLinksAccessory = (pin: Pin, accessories: List.Item.Accessory[], pins: Pin[], groups: Group[]) => {
  const linkCount = getLinkedPins(pin, pins, groups).length;
  if (linkCount > 0) {
    accessories.push({
      tag: { value: linkCount.toString(), color: Color.SecondaryText },
      tooltip: `${linkCount} Linked ${pluralize("Pin", linkCount)}`,
      icon: Icon.Link,
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
    const regexes = PinsPlaceholders.map((placeholder) => placeholder.regex);
    const urlAfterRemovingPlaceholders = regexes.reduce((acc, regex) => acc.replace(regex, ""), pin.url);
    if (urlAfterRemovingPlaceholders.trim().length > 0) {
      accessories.push({ icon: Icon.Terminal, tooltip: "Runs Terminal Command" });
    }
  }
};

/**
 * Adds a visibility accessory to the given list of accessories.
 * @param pin The pin to add the accessory for.
 * @param accessories The list of accessories to add the visibility accessory to.
 */
export const addVisibilityAccessory = (
  item: Pin | Group,
  accessories: List.Item.Accessory[],
  showingHidden: boolean,
) => {
  if (item.visibility === Visibility.MENUBAR_ONLY) {
    accessories.push({ tag: { value: "Menubar Only", color: Color.Blue }, tooltip: "Visible in Menubar Only" });
  } else if (item.visibility === Visibility.VIEW_PINS_ONLY && showingHidden) {
    accessories.push({
      tag: { value: "'View Pins' Only", color: Color.Purple },
      tooltip: "Visible in 'View Pins' Only",
    });
  } else if (item.visibility === Visibility.HIDDEN) {
    accessories.push({ tag: "Hidden", tooltip: `Hidden — Use Deeplinks to Open${isGroup(item) ? " Pins" : ""}` });
  } else if (item.visibility === Visibility.DISABLED) {
    const tooltip = isGroup(item) ? "Group Disabled — Member Pins Cannot be Opened" : "Pin Disabled — Cannot be Opened";
    accessories.push({ tag: { value: "Disabled", color: Color.Red }, tooltip });
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
    const regexes = PinsPlaceholders.map((placeholder) => placeholder.regex);
    const urlAfterRemovingPlaceholders = regexes.reduce((acc, regex) => acc.replace(regex, ""), pin.url);
    if (urlAfterRemovingPlaceholders.trim().length > 0) {
      accessories.push({
        icon: pin.execInBackground ? Icon.EyeDisabled : Icon.Eye,
        tooltip: pin.execInBackground ? "Executes in Background" : "Executes In New Terminal Tab",
      });
    }
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
  if (group.sortStrategy !== undefined && group.sortStrategy !== SORT_STRATEGY.manual) {
    accessories.push({
      tag: {
        value: SORT_STRATEGY[group.sortStrategy],
        color: Color.SecondaryText,
      },
    });
  }
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
