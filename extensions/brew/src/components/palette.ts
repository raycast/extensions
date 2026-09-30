/**
 * The semantic colour and icon vocabulary for the whole extension.
 *
 * One definition, because Search, Show Installed and Show Outdated were each
 * choosing their own and had drifted into contradicting one another: Search
 * painted an outdated package with a RED check, while red already means
 * "upgrade failed" in the upgrade flow, and Show Outdated marked the same state
 * with a GREY check — the "done" glyph for something conspicuously not done.
 *
 * The colours in use, and what each already means:
 *
 * | Colour          | Meaning                                      |
 * |-----------------|----------------------------------------------|
 * | Green           | up to date / upgraded                        |
 * | Blue            | in progress, or purely informational         |
 * | Red             | upgrade failed, or can't install             |
 * | SecondaryText   | skipped, or not installed                    |
 * | Orange          | needs attention, including update available  |
 * | Yellow          | LOW advisory severity, and nothing else      |
 *
 * Orange is the one free slot, and it reads as "there is something to do here"
 * without the alarm of red — an available update is not an error. Blue and
 * orange each carry two shades of one meaning, which is why `STATUS_COLOR`
 * names six entries over five colours: `inProgress`/`info` are both blue,
 * `attention` is orange whether it is an update or a warning.
 *
 * That table used to cover only a package's install state while ten other files
 * hardcoded `Color.*` with their own meanings. `STATUS_COLOR` below is the same
 * vocabulary named, so a new surface picks a meaning rather than a colour.
 */

import { Color, Icon, Image, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import type { VulnSeverity } from "../utils";

export const STATUS_COLOR = {
  /** Up to date, upgraded, running service, installed dependency. */
  ok: Color.Green,
  /** Work in flight: upgrading, a scheduled service. */
  inProgress: Color.Blue,
  /** Informational, not a problem: caveats. */
  info: Color.Blue,
  /** Something to do, no alarm: update available, deprecated, needs attention. */
  attention: Color.Orange,
  /** Brew refuses or failed: upgrade failed, can't install, errored service. */
  error: Color.Red,
  /** Absent or deliberately quiet: not installed, skipped, excluded, unused. */
  muted: Color.SecondaryText,
} as const;

/**
 * Advisory severity, in the same vocabulary. LOW is the one value with no
 * `STATUS_COLOR` equivalent: it sits between "there is something to do" and
 * "quiet", and yellow is what is left.
 */
export const SEVERITY_COLOR: Record<VulnSeverity, Color> = {
  CRITICAL: STATUS_COLOR.error,
  HIGH: STATUS_COLOR.error,
  MEDIUM: STATUS_COLOR.attention,
  LOW: Color.Yellow,
  UNKNOWN: STATUS_COLOR.muted,
};

/** Not installed. A hollow ring, deliberately quiet. */
const notInstalledColor: Color.Dynamic = {
  light: "#00000066",
  dark: "#FFFFFF66",
};

/** An installed package with a newer version available. */
export const UPDATE_AVAILABLE_ICON = { source: Icon.ArrowUpCircle, tintColor: STATUS_COLOR.attention };

/** An installed package on the current version. */
export const UP_TO_DATE_ICON = { source: Icon.CheckCircle, tintColor: STATUS_COLOR.ok };

/** Something brew refused or that failed outright. */
export const ERROR_ICON = { source: Icon.XMarkCircle, tintColor: STATUS_COLOR.error };

/** Work in flight — a half-filled ring rather than a static glyph. */
export const IN_PROGRESS_ICON = {
  source: getProgressIcon(0.5, STATUS_COLOR.inProgress),
  tintColor: STATUS_COLOR.inProgress,
};

/** A package that is simply not installed. */
const NOT_INSTALLED_ICON = { source: Icon.Circle, tintColor: notInstalledColor };

/** Something to look at that is not an error: deprecated, unsupported. */
export const WARNING_ICON = { source: Icon.Warning, tintColor: STATUS_COLOR.attention };

/** A package brew would refuse to install here — Homebrew's own ⊘ (`Formatter.error`). */
export const UNINSTALLABLE_ICON = { source: Icon.CircleDisabled, tintColor: STATUS_COLOR.error };

/** A formula carrying open advisories, tinted by its worst severity. */
export function vulnerableIcon(severity: VulnSeverity): Image.ImageLike {
  return { source: Icon.Shield, tintColor: SEVERITY_COLOR[severity] };
}

/** The colour of the "Outdated" tag, kept in step with the icon. */
export const UPDATE_AVAILABLE_COLOR = STATUS_COLOR.attention;

/**
 * A package brew would refuse to install here. Red, as Homebrew paints its own
 * ⊘ (`Formatter.error`) — the meaning is the same family as "upgrade failed":
 * brew will not do this.
 */
export const UNINSTALLABLE_COLOR = STATUS_COLOR.error;

/**
 * The list-item icon for a package, with the tooltip that explains it.
 *
 * @param isInstalled whether the package is installed at all
 * @param isOutdated whether a newer version is available
 * @param uninstallableReason why brew would refuse to install it here, if it would.
 *   Ignored when installed: Homebrew's own precedence puts ✔ ahead of ⊘.
 */
export function installStateIcon(
  isInstalled: boolean,
  isOutdated: boolean,
  uninstallableReason?: string,
): List.Item.Props["icon"] {
  if (!isInstalled) {
    if (uninstallableReason) {
      return { value: UNINSTALLABLE_ICON, tooltip: uninstallableReason };
    }
    return NOT_INSTALLED_ICON;
  }
  return isOutdated
    ? { value: UPDATE_AVAILABLE_ICON, tooltip: "Update available" }
    : { value: UP_TO_DATE_ICON, tooltip: "Up to date" };
}
