import { Keyboard } from "@raycast/api";

// Shortcuts are collected here so they can be reviewed together.
// Bare arrow keys and the 1 / 2 format keys are defined where they are used.

export const COPY_DATE: Keyboard.Shortcut = { modifiers: ["cmd"], key: "c" };

export const PREVIOUS_MONTH: Keyboard.Shortcut = { modifiers: ["cmd"], key: "[" };
export const NEXT_MONTH: Keyboard.Shortcut = { modifiers: ["cmd"], key: "]" };
export const PREVIOUS_YEAR: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "[" };
export const NEXT_YEAR: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "]" };

export const GO_TO_TODAY: Keyboard.Shortcut = { modifiers: ["cmd"], key: "t" };
export const GO_TO_MONTH: Keyboard.Shortcut = { modifiers: ["cmd"], key: "m" };
export const GO_TO_YEAR: Keyboard.Shortcut = { modifiers: ["cmd"], key: "y" };
