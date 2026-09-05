export const MODIFIERS = ["command", "option", "control", "shift", "fn"] as const;
export const OWNER_TYPES = ["mac-app", "webapp", "system", "other"] as const;
export const SCOPE_TYPES = ["global", "app", "webapp"] as const;
export const SOURCE_TYPES = ["default", "custom"] as const;

export type ShortcutModifier = (typeof MODIFIERS)[number];
export type OwnerType = (typeof OWNER_TYPES)[number];
export type ScopeType = (typeof SCOPE_TYPES)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];

export type Shortcut = {
  id: string;
  commandName: string;
  modifiers: ShortcutModifier[];
  key: string;
  shortcutDisplay: string;
  ownerName: string;
  ownerType: OwnerType;
  scope: ScopeType;
  notes?: string;
  sourceType: SourceType;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type DefaultShortcutDataset = {
  ownerName: string;
  ownerType: OwnerType;
  sourceUrl?: string;
  shortcuts: Array<{
    id: string;
    commandName: string;
    modifiers: ShortcutModifier[];
    key: string;
    scope: ScopeType;
    notes?: string;
    sourceUrl?: string;
  }>;
};

export type ShortcutExportFile = {
  format: "shortcut-vault";
  version: 1;
  exportedAt: string;
  shortcuts: Shortcut[];
};

export type ShortcutFormValues = {
  commandName: string;
  modifiers: ShortcutModifier[];
  key: string;
  ownerName: string;
  ownerType?: OwnerType;
  scope: ScopeType;
  notes: string;
};

export type ShortcutFilter = "all" | "default" | "custom";
