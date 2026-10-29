import { Color, Icon, type Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import type { AttioObject, AttioRecord } from "../api/types";

/**
 * UI-layer counterpart to `./display.ts` (which stays @raycast/api-free for
 * vitest) — anything needing Icon/Color/getFavicon lives here instead.
 */

export const STANDARD_OBJECT_ICONS: Record<string, Image.ImageLike> = {
  companies: { source: Icon.Building, tintColor: Color.Orange },
  deals: Icon.BankNote,
  people: { source: Icon.Person, tintColor: Color.Blue },
  users: { source: Icon.Person, tintColor: Color.Green },
  workspaces: Icon.AppWindowGrid2x2,
};
export const isStandardObject = (o: AttioObject) => !!STANDARD_OBJECT_ICONS[o.api_slug || ""];

/** Per-object List.Item icon: companies get a favicon from their first domain. */
export function recordIcon(record: AttioRecord, objectSlug: string): Image.ImageLike {
  switch (objectSlug) {
    case "people":
      return Icon.Person;
    case "deals":
      return Icon.BankNote;
    case "companies": {
      const domains = record.values.domains;
      const firstDomain = domains?.find((v) => v.attribute_type === "domain")?.domain;
      return firstDomain ? getFavicon(`https://${firstDomain}`, { fallback: Icon.Building }) : Icon.Building;
    }
    default:
      return Icon.Document;
  }
}

/** Semantic colors for connection-strength tags; everything else gets a stable hash-based color. */
const CONNECTION_STRENGTH_COLORS: Record<string, Color> = {
  "Very strong": Color.Green,
  Strong: Color.Blue,
  Weak: Color.Orange,
  "Very weak": Color.Red,
  "No communication": Color.SecondaryText,
};

const HASH_PALETTE = [Color.Blue, Color.Green, Color.Magenta, Color.Orange, Color.Purple, Color.Red, Color.Yellow];

/** Deterministic tag color for a select/status title — same title always gets the same color. */
export function tagColor(title: string): Color {
  const semantic = CONNECTION_STRENGTH_COLORS[title];
  if (semantic) return semantic;
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
  return HASH_PALETTE[Math.abs(hash) % HASH_PALETTE.length];
}
