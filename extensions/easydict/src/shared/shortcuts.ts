/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { Keyboard } from "@raycast/api";

/** Action panel keys live in one registry so sibling panels cannot drift into conflicting bindings. */
export const shortcuts = {
  showDetail: { macOS: { modifiers: ["cmd"], key: "m" }, Windows: { modifiers: ["ctrl"], key: "m" } },
  readQueryText: { macOS: { modifiers: ["cmd"], key: "r" }, Windows: { modifiers: ["ctrl"], key: "r" } },
  requery: {
    macOS: { modifiers: ["cmd", "opt"], key: "r" },
    Windows: { modifiers: ["ctrl", "alt"], key: "r" },
  },
  readResultText: {
    macOS: { modifiers: ["cmd", "shift"], key: "r" },
    Windows: { modifiers: ["ctrl", "shift"], key: "r" },
  },
  toggleFavorite: Keyboard.Shortcut.Common.Pin,
  addToAnki: { macOS: { modifiers: ["cmd", "opt"], key: "a" }, Windows: { modifiers: ["ctrl", "shift"], key: "a" } },
  openOnline: Keyboard.Shortcut.Common.Open,
} satisfies Record<string, Keyboard.Shortcut>;
