// Generated from shared/shortcuts-core; run scripts/sync-shortcuts-core.mjs --write.
import { resolveOverlayField } from "./overlay";
import type {
  AppShortcuts,
  AtomicShortcut,
  Keymap,
  Section,
  SectionShortcut,
  CustomApp,
  CustomKeymap,
  CustomSection,
  CustomShortcut,
  ShortcutOverlay,
  UserCustomizations,
} from "./types";
import { getSectionIdentities } from "./identity";
export class ShortcutMerger<M extends string, P extends string> {
  private overlayMap: Map<string, ShortcutOverlay>;
  private legacyOverlayMap: Map<string, ShortcutOverlay>;
  private identityOverlayBaseKeys: Set<string>;
  private consumedLegacyOverlays: Set<string>;
  private customKeymaps: CustomKeymap<P>[];

  constructor(
    customizations: UserCustomizations<P>,
    private readonly parseShortcutKey: (key: string) => AtomicShortcut<M>[]
  ) {
    this.overlayMap = new Map();
    this.legacyOverlayMap = new Map();
    this.identityOverlayBaseKeys = new Set();
    this.consumedLegacyOverlays = new Set();
    for (const overlay of customizations.shortcuts) {
      if (overlay.baseShortcutId) {
        this.identityOverlayBaseKeys.add(overlay.baseKey);
        this.overlayMap.set(this.buildOverlayIdentityKey(overlay.baseKey, overlay.baseShortcutId), overlay);
      } else {
        this.legacyOverlayMap.set(overlay.baseKey, overlay);
      }
    }
    this.customKeymaps = [...(customizations.customKeymaps ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
  }

  mergeShortcuts(baseApps: AppShortcuts<M, P>[], customizations: UserCustomizations<P>): AppShortcuts<M, P>[] {
    const mergedApps = baseApps.map((app) => this.mergeApp(app));

    const customAppShortcuts = customizations.customApps.map((customApp) =>
      this.convertCustomAppToAppShortcuts(customApp)
    );

    return [...mergedApps, ...customAppShortcuts];
  }

  private mergeApp(app: AppShortcuts<M, P>): AppShortcuts<M, P> {
    const appCustomKeymaps = this.customKeymaps.filter((keymap) => keymap.baseAppSlug === app.slug);
    const baseKeymaps = app.keymaps.map((keymap) => this.mergeKeymap(app.slug, keymap));

    return {
      ...app,
      keymaps: this.mergeCustomKeymaps(baseKeymaps, appCustomKeymaps),
    };
  }

  private mergeKeymap(appSlug: string, keymap: Keymap<M, P>): Keymap<M, P> {
    return {
      ...keymap,
      sections: keymap.sections.map((section) => this.mergeSection(appSlug, keymap.title, section)),
    };
  }

  private mergeSection(appSlug: string, keymapTitle: string, section: Section<M>): Section<M> {
    const { ids, aliases } = getSectionIdentities(section.hotkeys);
    const mergedHotkeys = section.hotkeys
      .map((hotkey, index) => {
        const baseShortcutId = ids[index];
        const baseKey = this.buildOverlayKey(appSlug, keymapTitle, section.title, hotkey.title);
        const overlay =
          this.overlayMap.get(this.buildOverlayIdentityKey(baseKey, baseShortcutId)) ??
          (aliases.get(baseShortcutId) ?? [])
            .map((id) => this.overlayMap.get(this.buildOverlayIdentityKey(baseKey, id)))
            .find(Boolean) ??
          this.getLegacyOverlay(baseKey);

        const baseHotkey: SectionShortcut<M> = {
          ...hotkey,
          baseShortcutId,
          ...(aliases.get(baseShortcutId)?.length ? { baseShortcutAliases: aliases.get(baseShortcutId) } : {}),
          baseSectionTitle: section.title,
          baseShortcutTitle: hotkey.title,
        };

        if (!overlay) return baseHotkey;

        if (overlay.modification.isDeleted) return null;

        return {
          ...baseHotkey,
          title: overlay.modification.title ?? hotkey.title,
          sequence: overlay.modification.keyIsCleared
            ? []
            : overlay.modification.key != null
              ? this.parseShortcutKey(overlay.modification.key)
              : hotkey.sequence,
          comment: resolveOverlayField(
            hotkey.comment,
            overlay.modification.comment,
            overlay.modification.commentIsCleared
          ),
          customizationStatus: "changed",
          customizationId: overlay.modification.id,
        };
      })
      .filter((h): h is SectionShortcut<M> => h !== null);

    return {
      ...section,
      hotkeys: mergedHotkeys,
    };
  }

  private mergeCustomKeymaps(keymaps: Keymap<M, P>[], customKeymaps: CustomKeymap<P>[]): Keymap<M, P>[] {
    const mergedKeymaps = [...keymaps];

    for (const customKeymap of customKeymaps) {
      const keymapIndex = mergedKeymaps.findIndex((keymap) => keymap.title === customKeymap.title);

      if (keymapIndex >= 0) {
        mergedKeymaps[keymapIndex] = this.mergeCustomSections(mergedKeymaps[keymapIndex], customKeymap.sections);
      } else {
        const convertedKeymap = this.convertCustomKeymapToKeymap(customKeymap);
        if (convertedKeymap.sections.length > 0) {
          mergedKeymaps.push(convertedKeymap);
        }
      }
    }

    return mergedKeymaps;
  }

  private mergeCustomSections(keymap: Keymap<M, P>, customSections: CustomSection[]): Keymap<M, P> {
    const sections = [...keymap.sections];

    for (const customSection of this.sortSections(customSections)) {
      const convertedSection = this.convertCustomSectionToSection(customSection);
      if (convertedSection.hotkeys.length === 0) {
        continue;
      }

      const sectionIndex = sections.findIndex((section) => section.title === convertedSection.title);
      if (sectionIndex >= 0) {
        sections[sectionIndex] = {
          ...sections[sectionIndex],
          hotkeys: [...sections[sectionIndex].hotkeys, ...convertedSection.hotkeys],
        };
      } else {
        sections.push(convertedSection);
      }
    }

    return {
      ...keymap,
      sections,
    };
  }

  private buildOverlayKey(appSlug: string, keymapTitle: string, sectionTitle: string, shortcutTitle: string): string {
    return `${appSlug}:${keymapTitle}:${sectionTitle}:${shortcutTitle}`;
  }

  private buildOverlayIdentityKey(baseKey: string, baseShortcutId: string): string {
    return `${baseKey}:${baseShortcutId}`;
  }

  private getLegacyOverlay(baseKey: string): ShortcutOverlay | undefined {
    if (this.identityOverlayBaseKeys.has(baseKey)) return undefined;
    if (this.consumedLegacyOverlays.has(baseKey)) return undefined;
    const overlay = this.legacyOverlayMap.get(baseKey);
    if (overlay) this.consumedLegacyOverlays.add(baseKey);
    return overlay;
  }

  private convertCustomKeymapToKeymap(customKeymap: CustomKeymap<P>): Keymap<M, P> {
    return {
      title: customKeymap.title,
      customKeymapId: customKeymap.id,
      platforms: customKeymap.platforms,
      sections: this.sortSections(customKeymap.sections)
        .map((section) => this.convertCustomSectionToSection(section))
        .filter((section) => section.hotkeys.length > 0),
    };
  }

  private convertCustomSectionToSection(customSection: CustomSection): Section<M> {
    return {
      title: customSection.title,
      hotkeys: this.sortShortcuts(customSection.shortcuts)
        .filter((shortcut) => !shortcut.isDeleted)
        .map((shortcut) => ({
          title: shortcut.title,
          sequence: shortcut.key ? this.parseShortcutKey(shortcut.key) : [],
          comment: shortcut.comment,
          customizationStatus: "created" as const,
          customizationId: shortcut.id,
          customShortcutId: shortcut.id,
        })),
    };
  }

  private sortSections(sections: CustomSection[]): CustomSection[] {
    return [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private sortShortcuts(shortcuts: CustomShortcut[]): CustomShortcut[] {
    return [...shortcuts].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private convertCustomAppToAppShortcuts(customApp: CustomApp<P>): AppShortcuts<M, P> {
    return {
      name: customApp.name,
      customAppId: customApp.id,
      hostname: customApp.hostname,
      slug: `custom-${customApp.slug}`,
      bundleId: customApp.bundleId,
      icon: customApp.icon,
      source: customApp.source,
      keymaps: [...customApp.keymaps]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((km) => ({
          title: km.title,
          customKeymapId: km.id,
          platforms: km.platforms,
          sections: this.sortSections(km.sections)
            .map((section) => this.convertCustomSectionToSection(section))
            .filter((section) => section.hotkeys.length > 0),
        })),
    };
  }
}
