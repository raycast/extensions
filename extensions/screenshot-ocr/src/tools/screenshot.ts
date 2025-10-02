// src/tools/screenshot.ts

import { Tool } from "@raycast/api"
import { performOcrCopyFlow } from "../flow"

/**
 * AI Tool: Screenshot OCR
 *
 * @remarks
 * Triggers the same core flow as the Copy commands: prompts the user to select a screen region, performs OCR on the
 * captured image, and copies the extracted text to the system clipboard.
 *
 * @important This tool overwrites the clipboard. The confirmation clarifies this and gives the user a chance to cancel.
 */
type Input = {
  /** Whether to include the mouse cursor in the screenshot. Optional, falls back to preferences. */
  includeCursor?: boolean
  /** Language hint for OCR (ISO 639-2 code like "eng"). Optional, falls back to preferences. */
  language?: string
}

/**
 * Execute the tool.
 *
 * @param _input Optional input for future overrides. Currently, preferences are used and overrides are ignored.
 */
export default async function tool(): Promise<void> {
  await performOcrCopyFlow()
}

/**
 * Confirmation shown to the user before executing the tool, describing its side-effects.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const info: { name: string; value?: string }[] = [
    { name: "Action", value: "Take a screenshot and OCR it" },
    { name: "Side effect", value: "Clipboard will be overwritten" },
  ]

  if (typeof input?.includeCursor === "boolean") {
    info.push({ name: "Include Cursor", value: String(input.includeCursor) })
  }
  if (input?.language) {
    info.push({ name: "Language", value: input.language })
  }

  return {
    message: "Capture a screen region, recognize text, and copy it to your clipboard?",
    info,
  }
}
