export interface UserProfile {
  id: string;
  clerkUserId: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface CustomApp {
  id: string;
  userId: string;
  slug: string;
  name: string;
  bundleId?: string;
  hostname?: string;
  source?: string;
  icon?: string;
  keymaps: CustomKeymap[];
}

export interface CustomKeymap {
  id: string;
  customAppId?: string;
  baseAppSlug?: string;
  title: string;
  sortOrder?: number;
  platforms?: string[];
  sections: CustomSection[];
}

export interface CustomSection {
  id: string;
  keymapId: string;
  title: string;
  sortOrder: number;
  shortcuts: CustomShortcut[];
}

export interface CustomShortcut {
  id: string;
  sectionId?: string;
  baseAppSlug?: string;
  baseKeymapTitle?: string;
  baseSectionTitle?: string;
  baseShortcutTitle?: string;
  baseShortcutId?: string;
  title: string;
  key?: string;
  keyIsCleared?: boolean;
  commentIsCleared?: boolean;
  comment?: string;
  isDeleted: boolean;
  sortOrder: number;
}

export interface Favorite {
  id: string;
  userId: string;
  itemType: "app" | "keymap" | "shortcut";
  appSlug?: string;
  keymapTitle?: string;
  shortcutTitle?: string;
  sectionTitle?: string;
  baseShortcutId?: string;
  customAppId?: string;
  customKeymapId?: string;
  customShortcutId?: string;
}

export interface ShortcutOverlay {
  baseKey: string;
  baseShortcutId?: string;
  modification: Partial<CustomShortcut>;
}

export interface UserCustomizations {
  customApps: CustomApp[];
  customKeymaps: CustomKeymap[];
  shortcuts: ShortcutOverlay[];
  favorites: Favorite[];
}
