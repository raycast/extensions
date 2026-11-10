import { Cache } from "@raycast/api";
import { z } from "zod";
import type { InboxSection } from "./api";

export const SECTION_SETTINGS_KEY = "section-settings";

const sectionSettingsSchema = z.object({
  /** Section ids the user hid. New sections created in Graphite show up by default. */
  hidden: z.array(z.string()),
  /** Section ids in the user's preferred order. Sections missing from it keep Graphite's order, at the end. */
  order: z.array(z.string()),
});

export type SectionSettings = z.infer<typeof sectionSettingsSchema>;

export const DEFAULT_SECTION_SETTINGS: SectionSettings = { hidden: [], order: [] };

/** All sections in the user's order, hidden ones included. */
export function arrangeSections(sections: InboxSection[], settings: SectionSettings): InboxSection[] {
  const rank = (section: InboxSection, index: number) => {
    const position = settings.order.indexOf(section.sectionId);
    return position === -1 ? settings.order.length + index : position;
  };
  return sections
    .map((section, index) => ({ section, rank: rank(section, index) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ section }) => section);
}

/** Visible sections in the user's order. */
export function visibleSections(sections: InboxSection[], settings: SectionSettings): InboxSection[] {
  return arrangeSections(sections, settings).filter((section) => !settings.hidden.includes(section.sectionId));
}

/**
 * Reads the settings that the Inbox and Menu Bar commands save with `useCachedState`, for code that can't use hooks
 * (AI tools). Raycast's cache is shared by every entry point of the extension.
 */
export function readSectionSettings(cache = new Cache()): SectionSettings {
  const raw = cache.get(SECTION_SETTINGS_KEY);
  if (!raw) return DEFAULT_SECTION_SETTINGS;
  try {
    const parsed = sectionSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_SECTION_SETTINGS;
  } catch {
    return DEFAULT_SECTION_SETTINGS;
  }
}
