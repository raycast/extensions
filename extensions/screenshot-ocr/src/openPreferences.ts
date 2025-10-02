// src/open-ocr-preferences.ts

import { openExtensionPreferences } from "@raycast/api"

/**
 * Command: Open OCR Preferences
 */
export default async function Command(): Promise<void> {
  await openExtensionPreferences()
}
