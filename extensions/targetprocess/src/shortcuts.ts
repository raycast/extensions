import { Keyboard } from "@raycast/api";

interface KeyBinding {
  modifiers: Keyboard.KeyModifier[];
  key: Keyboard.KeyEquivalent;
}

/**
 * Both platforms are mandatory, which `Keyboard.Shortcut` leaves optional.
 *
 * @raycast/no-ambiguous-platform-shortcut only inspects shortcut literals written inline on an
 * Action; it cannot see through a constant, so every shortcut in this codebase is invisible to it.
 * This type enforces the same rule at compile time instead.
 */
export interface PlatformShortcut {
  macOS: KeyBinding;
  Windows: KeyBinding;
}

/** Fails to compile if Raycast's Shortcut union stops accepting this shape. */
export type ShortcutIsCompatible = PlatformShortcut extends Keyboard.Shortcut ? true : never;
