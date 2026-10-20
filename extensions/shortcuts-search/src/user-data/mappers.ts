import type {
  CustomApp,
  CustomKeymap,
  CustomSection,
  CustomShortcut,
  Favorite,
  ShortcutOverlay,
  UserCustomizations,
  UserProfile,
} from "./models";

type Row = Record<string, unknown>;

interface CustomizationRows {
  customApps: unknown[];
  baseKeymaps: unknown[];
  overlays: unknown[];
}

export function mapProfile(row: Row): UserProfile {
  return {
    id: requiredString(row.id),
    clerkUserId: requiredString(row.clerk_user_id),
    displayName: optionalString(row.display_name),
    avatarUrl: optionalString(row.avatar_url),
    createdAt: requiredString(row.created_at),
  };
}

export function mapCustomizations(rows: CustomizationRows): UserCustomizations {
  return {
    customApps: mapCustomApps(rows.customApps),
    customKeymaps: mapCustomKeymaps(asRows(rows.baseKeymaps)),
    shortcuts: mapShortcutOverlays(asRows(rows.overlays)),
    favorites: [],
  };
}

export function mapFavorites(data: unknown[]): Favorite[] {
  return asRows(data).map((row) => ({
    id: requiredString(row.id),
    userId: requiredString(row.user_id),
    itemType: requiredString(row.item_type) as Favorite["itemType"],
    appSlug: optionalString(row.app_slug),
    keymapTitle: optionalString(row.keymap_title),
    shortcutTitle: optionalString(row.shortcut_title),
    sectionTitle: optionalString(row.section_title),
    baseShortcutId: optionalString(row.base_shortcut_id),
    customAppId: optionalString(row.custom_app_id),
    customKeymapId: optionalString(row.custom_keymap_id),
    customShortcutId: optionalString(row.custom_shortcut_id),
  }));
}

function mapCustomApps(data: unknown[]): CustomApp[] {
  return asRows(data).map((row) => ({
    id: requiredString(row.id),
    userId: requiredString(row.user_id),
    slug: requiredString(row.slug),
    name: requiredString(row.name),
    bundleId: optionalString(row.bundle_id),
    windowsAppId: optionalString(row.windows_app_id),
    windowsProcessName: optionalString(row.windows_process_name),
    hostname: optionalString(row.hostname),
    source: optionalString(row.source),
    icon: optionalString(row.icon),
    keymaps: mapCustomKeymaps(asRows(row.custom_keymaps)),
  }));
}

function mapCustomKeymaps(data: Row[]): CustomKeymap[] {
  return data
    .map((row) => ({
      id: requiredString(row.id),
      customAppId: optionalString(row.custom_app_id),
      baseAppSlug: optionalString(row.base_app_slug),
      title: requiredString(row.title),
      sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
      platforms: optionalStringArray(row.platforms),
      sections: mapCustomSections(asRows(row.custom_sections)),
    }))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function mapCustomSections(data: Row[]): CustomSection[] {
  return data.map((row) => ({
    id: requiredString(row.id),
    keymapId: requiredString(row.keymap_id),
    title: requiredString(row.title),
    sortOrder: requiredNumber(row.sort_order),
    shortcuts: mapCustomShortcuts(asRows(row.custom_shortcuts)),
  }));
}

function mapCustomShortcuts(data: Row[]): CustomShortcut[] {
  return data.map((row) => ({
    id: requiredString(row.id),
    sectionId: optionalString(row.section_id),
    baseAppSlug: optionalString(row.base_app_slug),
    baseKeymapTitle: optionalString(row.base_keymap_title),
    baseSectionTitle: optionalString(row.base_section_title),
    baseShortcutTitle: optionalString(row.base_shortcut_title),
    baseShortcutId: optionalString(row.base_shortcut_id),
    title: requiredString(row.title),
    key: optionalString(row.key),
    comment: optionalString(row.comment),
    isDeleted: row.is_deleted === true,
    keyIsCleared: row.key_is_cleared === true,
    commentIsCleared: row.comment_is_cleared === true,
    sortOrder: requiredNumber(row.sort_order),
  }));
}

function mapShortcutOverlays(data: Row[]): ShortcutOverlay[] {
  return data.map((row) => ({
    baseKey: [
      requiredString(row.base_app_slug),
      requiredString(row.base_keymap_title),
      requiredString(row.base_section_title),
      requiredString(row.base_shortcut_title),
    ].join(":"),
    baseShortcutId: optionalString(row.base_shortcut_id),
    modification: {
      id: requiredString(row.id),
      title: requiredString(row.title),
      key: optionalString(row.key),
      comment: optionalString(row.comment),
      isDeleted: row.is_deleted === true,
      keyIsCleared: row.key_is_cleared === true,
      commentIsCleared: row.comment_is_cleared === true,
    },
  }));
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function requiredString(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Invalid user data response");
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requiredNumber(value: unknown): number {
  if (typeof value !== "number") {
    throw new Error("Invalid user data response");
  }
  return value;
}

function optionalStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}
