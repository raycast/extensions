import type { OwnerType, ScopeType, ShortcutModifier, SourceType } from "../types/shortcut";

export const MODIFIER_LABELS: Record<ShortcutModifier, string> = {
  command: "Command",
  option: "Option",
  control: "Control",
  shift: "Shift",
  fn: "Fn",
};

export const MODIFIER_SYMBOLS: Record<ShortcutModifier, string> = {
  command: "⌘",
  option: "⌥",
  control: "⌃",
  shift: "⇧",
  fn: "fn",
};

export const OWNER_TYPE_LABELS: Record<OwnerType, string> = {
  "mac-app": "Mac App",
  webapp: "Webapp",
  system: "System",
  other: "General",
};

export const SCOPE_LABELS: Record<ScopeType, string> = {
  global: "Global",
  app: "App",
  webapp: "Webapp",
};

export const SOURCE_LABELS: Record<SourceType, string> = {
  default: "Default",
  custom: "Custom",
};
