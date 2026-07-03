// Raycast-side mirror of the web app's app/utils/listIconCatalog.js
// and app/utils/listVisibility.js. The web is the source of truth
// for the icon glyph set + colour palette + visibility chip rules;
// this module re-expresses those tables in Raycast's vocabulary
// (Icon enum values + hex strings the Raycast tintColor accepts)
// so the same list shows the same chip + glyph + tint in both
// surfaces. Keep this file and the two web files in lockstep when
// the catalog or visibility variants change.

import { Color, Icon } from "@raycast/api";

// Mirrors COLOR_PALETTE.fg in the list repo's
// app/utils/listIconCatalog.js. Hex strings rather than Color enum
// values because Raycast's tintColor accepts hex strings cleanly
// and the source palette is keyed in hex — no lossy mapping step.
const LIST_COLOR_HEX: Record<string, string> = {
  blue: "#1d9bf0",
  green: "#10b981",
  red: "#ef4444",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  orange: "#fb923c",
  cyan: "#06b6d4",
  pink: "#ec4899",
  sky: "#0ea5e9",
  slate: "#6b7280",
};

// Mirrors ICON_GLYPHS in app/utils/listIconCatalog.js, mapped to
// the closest match in Raycast's Icon enum. Three glyphs don't
// have a 1:1 (briefcase / food / sparkle) and use a closest-fit
// substitute (Building / MugSteam / Stars); the other 17 map
// directly. Unknown / null glyphs fall back to Icon.List, same
// fallback the web app's resolveListIcon uses when no glyph is set.
const LIST_GLYPH_ICON: Record<string, Icon> = {
  list: Icon.List,
  clipboard: Icon.Clipboard,
  briefcase: Icon.Building,
  medical: Icon.MedicalSupport,
  terminal: Icon.Terminal,
  book: Icon.Book,
  food: Icon.MugSteam,
  leaf: Icon.Leaf,
  music: Icon.Music,
  globe: Icon.Globe,
  star: Icon.Star,
  heart: Icon.Heart,
  bolt: Icon.Bolt,
  flag: Icon.Flag,
  calendar: Icon.Calendar,
  folder: Icon.Folder,
  cloud: Icon.Cloud,
  sparkle: Icon.Stars,
  tag: Icon.Tag,
  target: Icon.BullsEye,
};

// Resolve the Raycast icon (source + optional tintColor) for a
// list given its catalog icon + color names. Falls back to a plain
// List icon (no tint) when either is missing or unrecognised, same
// fallback shape the web app uses.
export function iconForList(icon: string | null, color: string | null) {
  const source = (icon && LIST_GLYPH_ICON[icon]) || Icon.List;
  if (!color) return { source };
  const hex = LIST_COLOR_HEX[color];
  if (!hex) return { source };
  return { source, tintColor: hex as Color };
}

// Three-variant chip resolver mirroring app/utils/listVisibility.js
// in the web app — the single source of truth for the globe /
// people / lock chip next to a list name:
//   • public  — anyone can read the list (globe)
//   • shared  — list is private and lives in a team workspace, so
//               the workspace's members can read it (people). The
//               lock icon would mislead here — "private" really
//               means "shared with the team", not "only me".
//   • private — list is private in a personal workspace (lock)
// Keep this and the web helper in lockstep when the variant set
// changes; the on-the-wire shape (isPublic + workspaceType) is the
// raw data the two helpers share.
export function listVisibility(isPublic: boolean, workspaceType: string) {
  if (isPublic) return { label: "Public", icon: Icon.Globe };
  if (workspaceType === "team")
    return { label: "Shared", icon: Icon.TwoPeople };
  return { label: "Private", icon: Icon.Lock };
}
