// src/copyLastResult.ts

import { Clipboard, showHUD, LocalStorage, Toast, showToast } from "@raycast/api"
import { LS_LAST_OCR_TEXT } from "./constants"

/**
 * Command: Copy Last OCR Result
 *
 * Copies the last recognized OCR text from LocalStorage back to the clipboard
 * and shows a snippet HUD for quick confirmation.
 */
export default async function Command(): Promise<void> {
  try {
    const last = await LocalStorage.getItem<string>(LS_LAST_OCR_TEXT)
    const text = (last || "").trim()
    if (!text) {
      await showToast({ style: Toast.Style.Failure, title: "No last OCR result found" })
      return
    }
    await Clipboard.copy(text)
    const snippetRaw = text.replace(/\s+/g, " ").trim()
    const snippet = snippetRaw.slice(0, 80) + (snippetRaw.length > 80 ? "…" : "")
    await showHUD(`Copied last OCR: ${snippet}`)
  } catch (e) {
    await showFailureToast(e as Error, { title: "Failed to copy last result" })
  }
}
