// src/ocr-copy-and-paste.ts

import { performOcrCopyFlow } from "./flow"

/**
 * Command: OCR COPY & PASTE
 *
 * Capture a region, OCR it, copy to clipboard and paste into the frontmost app.
 */
export default async function Command(): Promise<void> {
  await performOcrCopyFlow({ autoPasteOverride: true })
}
