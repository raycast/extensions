import type { Application, SectionShortcut } from "../model/internal/internal-models";

import type { FavoriteIdentifier } from "../shortcut-core/favorites";
export { matchesFavorite } from "../shortcut-core/favorites";
export type { FavoriteIdentifier } from "../shortcut-core/favorites";

export function toShortcutFavoriteIdentifier(
  application: Pick<Application, "slug" | "customAppId">,
  keymapTitle: string,
  sectionTitle: string,
  shortcut: SectionShortcut
): FavoriteIdentifier {
  return {
    itemType: "shortcut",
    appSlug: application.slug,
    customAppId: application.customAppId,
    keymapTitle,
    sectionTitle: shortcut.baseSectionTitle ?? sectionTitle,
    shortcutTitle: shortcut.baseShortcutTitle ?? shortcut.title,
    baseShortcutId: shortcut.baseShortcutId,
    baseShortcutAliases: shortcut.baseShortcutAliases,
    customShortcutId:
      shortcut.customShortcutId ??
      (application.customAppId || shortcut.customizationStatus === "created" ? shortcut.customizationId : undefined),
  };
}

export function toFavoriteInsert(userId: string, identifier: FavoriteIdentifier): Record<string, string | null> {
  return {
    user_id: userId,
    item_type: identifier.itemType,
    app_slug: identifier.appSlug ?? null,
    keymap_title: identifier.keymapTitle ?? null,
    section_title: identifier.sectionTitle ?? null,
    shortcut_title: identifier.shortcutTitle ?? null,
    base_shortcut_id: identifier.baseShortcutId ?? null,
    custom_app_id: identifier.customKeymapId || identifier.customShortcutId ? null : (identifier.customAppId ?? null),
    custom_keymap_id: identifier.customShortcutId ? null : (identifier.customKeymapId ?? null),
    custom_shortcut_id: identifier.customShortcutId ?? null,
  };
}
