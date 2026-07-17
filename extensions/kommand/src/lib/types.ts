/**
 * TypeScript interfaces matching Kommand's SwiftData schema.
 *
 * The SQLite tables are CoreData-style (Z-prefixed columns) because
 * SwiftData uses CoreData's persistent store under the hood.
 */

/** One step in a keyboard shortcut sequence (mirrors ShortcutStep.swift) */
export interface ShortcutStep {
  /** Key code (undefined for modifier-only steps like ⇧⇧) */
  keyCode?: number;
  /** NSEvent.ModifierFlags rawValue */
  modifierFlags: number;
}

/** A shortcut with its category context, as returned by our SQL query */
export interface KommandShortcut {
  id: number;
  title: string;
  isFavorite: boolean;
  isGlobal: boolean;
  steps: ShortcutStep[];
  categoryName: string;
  categoryIsDefault: boolean;
}

/** Raw row shape returned by the SQLite query */
export interface ShortcutRow {
  id: number;
  title: string;
  isFavorite: number; // SQLite boolean: 0 or 1
  isGlobal: number; // SQLite boolean: 0 or 1
  sequenceData: Buffer | null;
  legacyKeyCode: number;
  legacyModifierFlags: number;
  categoryName: string;
  categoryIsDefault: number; // SQLite boolean: 0 or 1
}

/** Raw row shape for the all-shortcuts query (includes app info) */
export interface ShortcutRowWithApp extends ShortcutRow {
  appName: string | null;
  bundleIdentifier: string;
}
