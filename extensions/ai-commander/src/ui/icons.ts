import { Icon } from "@raycast/api";
import type { CreativityLevel, ReasoningLevel } from "../core/types";

/** A short list keeps the form usable; the full enum has hundreds of entries. Imported prompts may use any other. */
export const ICON_CHOICES: readonly string[] = [
  "Stars",
  "Text",
  "Pencil",
  "Globe",
  "BulletPoints",
  "SpeechBubble",
  "Envelope",
  "Book",
  "CodeBlock",
  "Code",
  "Terminal",
  "CheckCircle",
  "Eye",
  "LightBulb",
  "MagnifyingGlass",
  "Hammer",
  "Wand",
  "Hashtag",
  "Document",
  "Clipboard",
  "Bird",
  "Heart",
  "Person",
  "Tag",
];

/** `BulletPoints` becomes `Bullet Points`. */
export function iconTitle(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** Stored icons are enum keys. Unknown keys (older or imported data) fall back instead of breaking the list. */
export function resolveIcon(key: string | undefined): Icon {
  const icons = Icon as unknown as Record<string, Icon | undefined>;
  return (key ? icons[key] : undefined) ?? Icon.Stars;
}

/** Reasoning and creativity share one scale: a light bulb for the model's default, then a ring filling up. */
export const LEVEL_ICONS: Readonly<Record<ReasoningLevel | CreativityLevel, Icon>> = {
  default: Icon.LightBulb,
  off: Icon.Circle,
  none: Icon.Circle,
  low: Icon.CircleProgress25,
  medium: Icon.CircleProgress50,
  high: Icon.CircleProgress75,
  maximum: Icon.CircleProgress100,
};
