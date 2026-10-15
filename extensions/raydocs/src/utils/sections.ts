import { Color, Icon } from "@raycast/api";

type SectionAppearance = {
  icon: Icon;
  tintColor: Color;
};

/**
 * Sections come from the remote table of contents, so this is a best-effort map rather than an
 * exhaustive one — anything unrecognised falls back to a neutral document icon.
 */
const SECTION_APPEARANCE: Record<string, SectionAppearance> = {
  "Table of contents": { icon: Icon.List, tintColor: Color.SecondaryText },
  Basics: { icon: Icon.Book, tintColor: Color.Blue },
  AI: { icon: Icon.Stars, tintColor: Color.Purple },
  Teams: { icon: Icon.TwoPeople, tintColor: Color.Green },
  Examples: { icon: Icon.Code, tintColor: Color.Orange },
  Information: { icon: Icon.Info, tintColor: Color.Yellow },
  "API Reference": { icon: Icon.Plug, tintColor: Color.Magenta },
  Utilities: { icon: Icon.Hammer, tintColor: Color.Red },
  Misc: { icon: Icon.EllipsisVertical, tintColor: Color.SecondaryText },
};

const FALLBACK: SectionAppearance = { icon: Icon.Document, tintColor: Color.SecondaryText };

/**
 * The section decides the colour; being an external link decides the shape. A row therefore reads
 * as "which part of the docs" at a glance without losing the external-link signal.
 */
export function getLinkAppearance(sectionTitle: string | undefined, external: boolean) {
  // Object.hasOwn, not a truthiness check: section titles come from remote markdown, and a
  // heading named `constructor` or `toString` would otherwise resolve to an inherited property
  // — truthy, so it silently replaces the fallback with undefined icon and colour.
  const { icon, tintColor } =
    sectionTitle && Object.hasOwn(SECTION_APPEARANCE, sectionTitle) ? SECTION_APPEARANCE[sectionTitle] : FALLBACK;

  return { source: external ? Icon.Link : icon, tintColor };
}
