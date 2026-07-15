// Raycast-side mirror of the web app's app/utils/listIconCatalog.js
// and app/utils/listVisibility.js. The web is the source of truth
// for the icon glyph set + colour palette + visibility chip rules;
// this module re-expresses those tables in Raycast's vocabulary
// (Icon enum values + hex strings the Raycast tintColor accepts)
// so the same list shows the same chip + glyph + tint in both
// surfaces. Keep this file and the two web files in lockstep when
// the catalog or visibility variants change.

import { Color, Icon, Image } from "@raycast/api";

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

// Keyword-based fallback when a list has no explicit icon/color set.
// Mirrors KEYWORD_RULES in app/utils/listIconCatalog.js exactly
// (order matters, first match wins) so a list like "Project
// Management" or "Vocabulary" gets the same themed icon + color in
// Raycast as on the web.
const KEYWORD_RULES: { match: RegExp; icon: string; color: string }[] = [
  {
    match: /(project|task|plan|management|kanban|sprint)/i,
    icon: "clipboard",
    color: "blue",
  },
  {
    match: /(business|work|office|company|finance|sales|marketing|mckinsey)/i,
    icon: "briefcase",
    color: "green",
  },
  {
    match: /(medical|health|doctor|hospital|clinic|blood|lab|test|fitness)/i,
    icon: "medical",
    color: "red",
  },
  {
    match: /(comput|tech|code|develop|software|engineer|programming|dev)/i,
    icon: "terminal",
    color: "purple",
  },
  {
    match: /(book|read|library|reference|literature|dictionary|word|vocab)/i,
    icon: "book",
    color: "amber",
  },
  {
    match: /(food|recipe|cook|cuisine|kitchen|meal|drink)/i,
    icon: "food",
    color: "orange",
  },
  {
    match: /(fish|bird|animal|nature|plant|flower|pet|wildlife|garden)/i,
    icon: "leaf",
    color: "cyan",
  },
  {
    match: /(music|song|sound|audio|band|album)/i,
    icon: "music",
    color: "pink",
  },
  {
    match: /(travel|country|city|geography|map|trip)/i,
    icon: "globe",
    color: "sky",
  },
];

// Mirrors FALLBACK_PALETTE_KEYS in the web catalog: the deterministic
// id-based color for lists that match no keyword rule, so every list
// gets SOME stable tint rather than a colorless glyph.
const FALLBACK_PALETTE_KEYS = [
  "blue",
  "green",
  "purple",
  "amber",
  "pink",
  "cyan",
  "red",
];

// Resolve the Raycast icon (source + optional tintColor) for a list.
// Full port of the web's resolveListIcon three-tier resolution:
// explicit icon + color, then keyword rules on the list name, then a
// deterministic id-based fallback color with the default list glyph.
// Callers pass name + id so tiers 2 and 3 work; a bare
// { icon, color } call would silently regress to colorless fallbacks.
export function iconForList({
  icon,
  color,
  name = "",
  id = 0,
}: {
  icon: string | null;
  color: string | null;
  name?: string;
  id?: number;
}) {
  let resolvedIcon = icon;
  let resolvedColor = color;
  if (!(icon && LIST_GLYPH_ICON[icon] && color && LIST_COLOR_HEX[color])) {
    const rule = KEYWORD_RULES.find((r) => r.match.test(name));
    if (rule) {
      resolvedIcon = icon ?? rule.icon;
      resolvedColor = color ?? rule.color;
    } else {
      resolvedIcon = icon ?? "list";
      resolvedColor =
        color ??
        FALLBACK_PALETTE_KEYS[(Number(id) || 0) % FALLBACK_PALETTE_KEYS.length];
    }
  }
  const source = (resolvedIcon && LIST_GLYPH_ICON[resolvedIcon]) || Icon.List;
  const hex = resolvedColor ? LIST_COLOR_HEX[resolvedColor] : undefined;
  return hex ? { source, tintColor: hex as Color } : { source };
}

// Resolve the Raycast icon for a workspace: its uploaded avatar as a
// circle-masked remote image when one is set, else a type-based fallback
// glyph (a single person for a personal workspace, two people for a
// team). `avatar_url` from /api/v1/workspaces is a full public storage
// URL (services/workspaces.js → getPublicUrl), so it renders directly as
// a remote image. Used by the Search command's workspace dropdown; the
// form list-pickers group by workspace via Form.Dropdown.Section headers,
// which Raycast doesn't let carry an icon, so the avatar can't ride there.
export function iconForWorkspace(
  avatarUrl: string | null | undefined,
  type: string,
): Image.ImageLike {
  if (avatarUrl) {
    return { source: avatarUrl, mask: Image.Mask.Circle };
  }
  return type === "personal" ? Icon.Person : Icon.TwoPeople;
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
