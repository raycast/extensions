import { Color, Image } from "@raycast/api";

/**
 * The five-state dial (index angle = level), as SVG so it stays sharp at menu and list sizes.
 * `filled` marks the current level, in both themes. Black glyphs tinted to the text color
 * (house rule `monochrome-icon`). Not for a List.EmptyView: a tinted asset renders nothing there.
 */
export function dialIcon(index: number, filled = false): Image.ImageLike {
  return { source: `dial-${index}${filled ? "-filled" : ""}.svg`, tintColor: Color.PrimaryText };
}

export function menuBarIcon(index: number): Image.ImageLike {
  return { source: { light: `dial-${index}.svg`, dark: `dial-${index}-filled.svg` }, tintColor: Color.PrimaryText };
}
