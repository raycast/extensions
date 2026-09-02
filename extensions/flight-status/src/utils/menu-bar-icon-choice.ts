import { Image } from "@raycast/api";
import { MenuBarIconChoice } from "../types";
import { MenuBarIcon } from "./menu-bar-icon";

/**
 * Resolve the menu bar icon to display, honoring the user's preference.
 *
 * - `"airline"`: the airline's logo. When the airline is unknown (no
 *   `logoUrl`) it uses the full phase-aware icon (with color). When a logo URL
 *   exists but the image fails to load, Raycast renders `Image.fallback` —
 *   which can only be an icon/asset, not a tinted object — so the fallback
 *   shows the phase-appropriate airplane *shape* without the phase color
 *   (Raycast's fallback API cannot carry a `tintColor`).
 * - `"app"`: the phase-aware airplane icon (with color).
 * - `"none"`: no icon — unless `forceIcon` is set (e.g. the title would be
 *   empty), in which case the phase-aware airplane is shown so the menu bar
 *   item is never blank.
 */
export function resolveMenuBarIcon(
  choice: MenuBarIconChoice,
  phaseIcon: MenuBarIcon,
  logoUrl: string | null,
  forceIcon: boolean,
): Image.ImageLike | undefined {
  if (choice === "none") {
    return forceIcon ? phaseIcon : undefined;
  }
  if (choice === "airline" && logoUrl) {
    return { source: logoUrl, fallback: phaseIcon.source };
  }
  return phaseIcon;
}
