import { useCachedState } from "@raycast/utils";
import { InboxSection } from "../lib/api";
import {
  arrangeSections,
  DEFAULT_SECTION_SETTINGS,
  SECTION_SETTINGS_KEY,
  SectionSettings,
  visibleSections,
} from "../lib/section-settings";

/**
 * Which Graphite inbox sections to show, and in what order. Graphite's sections are user-defined, so this only
 * filters and reorders them; it never invents new ones. Shared by the Inbox and Menu Bar commands and the AI tools.
 */
export function useSectionSettings() {
  const [settings, setSettings] = useCachedState<SectionSettings>(SECTION_SETTINGS_KEY, DEFAULT_SECTION_SETTINGS);

  const arrange = (sections: InboxSection[]) => arrangeSections(sections, settings);
  const isHidden = (sectionId: string) => settings.hidden.includes(sectionId);

  return {
    /** All sections in the user's order, hidden ones included (for the settings screen). */
    arrange,
    /** Visible sections in the user's order. */
    visible: (sections: InboxSection[]) => visibleSections(sections, settings),
    isHidden,
    toggle(sectionId: string) {
      setSettings({
        ...settings,
        hidden: isHidden(sectionId)
          ? settings.hidden.filter((id) => id !== sectionId)
          : [...settings.hidden, sectionId],
      });
    },
    move(sections: InboxSection[], sectionId: string, offset: -1 | 1) {
      const ids = arrange(sections).map((section) => section.sectionId);
      const from = ids.indexOf(sectionId);
      const to = from + offset;
      if (from === -1 || to < 0 || to >= ids.length) return;
      [ids[from], ids[to]] = [ids[to], ids[from]];
      setSettings({ ...settings, order: ids });
    },
    reset: () => setSettings(DEFAULT_SECTION_SETTINGS),
    hasCustomizations: settings.hidden.length > 0 || settings.order.length > 0,
  };
}
