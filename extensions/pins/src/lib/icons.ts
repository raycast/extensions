/**
 * @module lib/icons.ts Utility functions for getting icons from various sources.
 *
 * @summary Icon utilities.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:35:54
 * Last modified  : 2023-11-01 00:44:02
 */

import { Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { Pin } from "./Pins";
import { Group } from "./Groups";

/**
 * A map of icon strings to their corresponding icon objects.
 */
export const iconMap = Icon as Record<string, Icon>;

/**
 * Converts a vague icon reference to an icon object.
 * @param iconRef The icon reference to convert.
 * @param color The color to tint the icon.
 * @returns The icon object.
 */
export const getIcon = (iconRef: string, color?: string) => {
  if (iconRef in iconMap) {
    return { source: iconMap[iconRef], tintColor: color };
  } else if (iconRef.startsWith("/") || iconRef.startsWith("~")) {
    return { fileIcon: iconRef };
  } else if (iconRef.match(/^[a-zA-Z0-9]*?:.*/g)) {
    return getFavicon(iconRef);
  } else if (iconRef == "None" || iconRef.replace(/{{(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/g, "").trim().length == 0) {
    return { source: Icon.Minus, tintColor: color };
  }
  return { source: Icon.Terminal, tintColor: color };
};

/**
 * Gets the icon for a given pin, regardless of whether it's a URL, file path, or icon reference.
 * @param pin The pin to get the icon for.
 * @returns The icon object.
 */
export const getPinIcon = (pin: Pin) => {
  return pin.icon in iconMap || pin.icon == "None" || pin.icon.startsWith("/")
    ? getIcon(pin.icon, pin.iconColor)
    : pin.fragment
      ? Icon.Text
      : getIcon(pin.url);
};

/**
 * Gets the icon for a given group.
 * @param group The group to get the icon for.
 * @returns The icon object.
 */
export const getGroupIcon = (group: Group) => {
  return group.name == "Recent Applications"
    ? Icon.Clock
    : group.icon in iconMap
      ? { source: iconMap[group.icon], tintColor: group.iconColor }
      : Icon.Minus;
};
