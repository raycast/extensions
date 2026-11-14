// Generated from shared/shortcuts-core; run scripts/sync-shortcuts-core.mjs --write.
export interface FavoriteIdentifier {
  itemType: "app" | "keymap" | "shortcut";
  appSlug?: string;
  keymapTitle?: string;
  sectionTitle?: string;
  shortcutTitle?: string;
  baseShortcutId?: string;
  baseShortcutAliases?: string[];
  customAppId?: string;
  customKeymapId?: string;
  customShortcutId?: string;
}

export function matchesFavorite<T extends FavoriteIdentifier>(favorite: T, identifier: FavoriteIdentifier): boolean {
  if (favorite.itemType !== identifier.itemType) return false;
  if (favorite.customShortcutId || identifier.customShortcutId)
    return favorite.customShortcutId === identifier.customShortcutId;
  if (identifier.itemType === "keymap" && (favorite.customKeymapId || identifier.customKeymapId))
    return favorite.customKeymapId === identifier.customKeymapId;
  if (favorite.customAppId && identifier.customAppId) {
    if (favorite.customAppId !== identifier.customAppId) return false;
  } else if ((favorite.appSlug ?? undefined) !== (identifier.appSlug ?? undefined)) return false;
  if (identifier.itemType === "app") return true;
  if (favorite.keymapTitle !== identifier.keymapTitle) return false;
  if (identifier.itemType === "keymap") return true;
  if (favorite.sectionTitle !== identifier.sectionTitle) return false;

  if (favorite.baseShortcutId && identifier.baseShortcutId) {
    return (
      favorite.baseShortcutId === identifier.baseShortcutId ||
      (identifier.baseShortcutAliases?.includes(favorite.baseShortcutId) ?? false)
    );
  }

  return favorite.shortcutTitle === identifier.shortcutTitle;
}
