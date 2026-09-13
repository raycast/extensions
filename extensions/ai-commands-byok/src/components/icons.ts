import { Icon } from "@raycast/api";

/** Icons offered in the command form. Keys are `Icon` enum members. */
export const ICON_CHOICES = [
  "Wand",
  "Pencil",
  "Check",
  "Eraser",
  "Text",
  "Paragraph",
  "ShortParagraph",
  "BulletPoints",
  "LightBulb",
  "Stars",
  "Bolt",
  "Message",
  "Envelope",
  "Globe",
  "Code",
  "Book",
  "Hashtag",
  "QuoteBlock",
  "Bird",
  "Emoji",
] as const;

const byKey = Icon as unknown as Record<string, Icon>;
const byValue = new Map(Object.entries(byKey).map(([k, v]) => [v as string, k]));

/** Accepts an `Icon` key ("Wand") or a raw Raycast icon id ("wand-16", as found in exports). */
export function iconFor(name: string): Icon {
  return byKey[iconKey(name)] ?? Icon.Wand;
}

export function iconKey(name: string): string {
  if (name in byKey) return name;
  return byValue.get(name) ?? "Wand";
}
