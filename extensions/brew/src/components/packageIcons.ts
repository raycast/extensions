/**
 * The icon vocabulary for a package's install state.
 *
 * One definition, because Search, Show Installed and Show Outdated were each
 * choosing their own and had drifted into contradicting one another: Search
 * painted an outdated package with a RED check, while red already means
 * "upgrade failed" in the upgrade flow, and Show Outdated marked the same state
 * with a GREY check — the "done" glyph for something conspicuously not done.
 *
 * The colours in use, and what each already means:
 *
 * | Colour          | Meaning                          |
 * |-----------------|----------------------------------|
 * | Green           | up to date / upgraded            |
 * | Blue            | upgrade in progress              |
 * | Red             | upgrade failed                   |
 * | SecondaryText   | skipped, or not installed        |
 * | Yellow          | update available (this file)     |
 *
 * Yellow is the one free slot, and it reads as "there is something to do here"
 * without the alarm of red — an available update is not an error.
 */

import { Color, Icon, List } from "@raycast/api";

/** Not installed. A hollow ring, deliberately quiet. */
const notInstalledColor: Color.Dynamic = {
  light: "#00000066",
  dark: "#FFFFFF66",
};

/** An installed package with a newer version available. */
export const UPDATE_AVAILABLE_ICON = { source: Icon.ArrowUpCircle, tintColor: Color.Yellow };

/** An installed package on the current version. */
export const UP_TO_DATE_ICON = { source: Icon.CheckCircle, tintColor: Color.Green };

/** The colour of the "Outdated" tag, kept in step with the icon. */
export const UPDATE_AVAILABLE_COLOR = Color.Yellow;

/**
 * The list-item icon for a package, with the tooltip that explains it.
 *
 * @param isInstalled whether the package is installed at all
 * @param isOutdated whether a newer version is available
 */
export function installStateIcon(isInstalled: boolean, isOutdated: boolean): List.Item.Props["icon"] {
  if (!isInstalled) {
    return { source: Icon.Circle, tintColor: notInstalledColor };
  }
  return isOutdated
    ? { value: UPDATE_AVAILABLE_ICON, tooltip: "Update available" }
    : { value: UP_TO_DATE_ICON, tooltip: "Up to date" };
}
