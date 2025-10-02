// src/toggle-auto-paste.ts

import { LocalStorage, showHUD } from "@raycast/api"

/**
 * Command: Toggle Auto Paste (⌘V after OCR)
 *
 * Flips a persistent override for auto-paste behavior stored in LocalStorage.
 * Flow precedence: inline override > persisted override > preference.
 */
export default async function Command(): Promise<void> {
  const key = "autoPasteOverride"
  const current = await LocalStorage.getItem<string>(key)
  const next = current === "true" ? "false" : "true"
  await LocalStorage.setItem(key, next)
  const on = next === "true"
  await showHUD(on ? "Auto Paste: ON (⌘V after OCR)" : "Auto Paste: OFF")
}
