// src/flow.ts

/**
 * Core flow to capture a screenshot, run OCR, and copy result to the clipboard.
 *
 * @packageDocumentation
 */

import { Clipboard, Toast, getPreferenceValues, showHUD, showToast, LocalStorage } from "@raycast/api"
import {
  LS_AUTO_PASTE_OVERRIDE,
  LS_LANG_OVERRIDE,
  LS_LAST_OCR_LANGUAGE,
  LS_LAST_OCR_TEXT,
  LS_LAST_SHOT_PATH,
} from "./constants"
import { unlink } from "fs/promises"
import { execFile } from "child_process"
import { promisify } from "util"
import type { ExtensionPreferences, OcrProvider } from "./types"
import { captureInteractiveScreenshot } from "./screenshot"
import { OcrSpaceProvider } from "./ocr"
import { TesseractProvider } from "./ocr-tesseract"
import { applyPostProcessing } from "./postprocess"

/**
 * Run the OCR Copy/Paste flow once: capture selection, OCR the image, and copy text.
 *
 * @remarks
 * This function handles user cancellation gracefully. If the user cancels the screenshot selection, a
 * non-failure toast is shown and the function returns early.
 *
 * @returns The recognized text if successful, otherwise `undefined` if cancelled or on error.
 */
export async function performOcrCopyFlow(options?: { autoPasteOverride?: boolean }): Promise<string | undefined> {
  const prefs = getPreferenceValues<ExtensionPreferences>()
  const includeCursor = (prefs.includeCursor ?? prefs.screenshotCursor) ? true : false
  // Language precedence: inline option (future) > LocalStorage override > preference
  let language = prefs.ocrLanguage || "eng"
  try {
    const langOverride = await LocalStorage.getItem<string>(LS_LANG_OVERRIDE)
    if (typeof langOverride === "string" && langOverride.trim()) {
      language = langOverride.trim()
    }
  } catch {
    // Ignore LocalStorage errors
  }

  // Determine autoPaste in order of precedence: inline option override > persistent toggle > preference
  let persistedOverride: boolean | undefined
  try {
    const raw = await LocalStorage.getItem<string>(LS_AUTO_PASTE_OVERRIDE)
    if (typeof raw === "string") {
      persistedOverride = raw === "true"
    }
  } catch {
    // Ignore LocalStorage errors
  }

  const autoPaste =
    typeof options?.autoPasteOverride === "boolean"
      ? options.autoPasteOverride
      : typeof persistedOverride === "boolean"
        ? persistedOverride
        : prefs.autoPaste !== false

  let shotPath: string | undefined

  try {
    // If using Tesseract, proactively check availability
    if (prefs.ocrProvider === "tesseract") {
      const pexecFile = promisify(execFile)
      try {
        await pexecFile("tesseract", ["--version"]) // Quick availability check
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Tesseract Not Installed",
          message: "Install with: brew install tesseract",
        })
        return undefined
      }
    }

    await showToast({ style: Toast.Style.Animated, title: "Capture area for OCR…" })
    const shot = await captureInteractiveScreenshot({ includeCursor })
    shotPath = shot.filePath

    // Maintain only the most recent screenshot on disk for debugging: delete previously stored one if different
    try {
      const previousPath = await LocalStorage.getItem<string>(LS_LAST_SHOT_PATH)
      if (previousPath && previousPath !== shotPath) {
        try {
          await unlink(previousPath)
        } catch {
          // Ignore file deletion errors
        }
      }
      await LocalStorage.setItem(LS_LAST_SHOT_PATH, shotPath)
    } catch {
      // Ignore LocalStorage errors
    }

    await showToast({ style: Toast.Style.Animated, title: "Recognizing text…" })
    const provider: OcrProvider =
      prefs.ocrProvider === "tesseract" ? new TesseractProvider() : new OcrSpaceProvider(prefs.ocrSpaceApiKey)
    const result = await provider.recognize(shot.filePath, language)

    let text = (result.text || "").trim()
    if (!text) {
      await showToast({ style: Toast.Style.Failure, title: "No text recognized" })
      return undefined
    }

    // Apply post-processing if enabled
    text = await applyPostProcessing({
      text,
      heuristics: (prefs.postprocessText ?? prefs.postprocessHeuristics) !== false,
      useRaycastAI: !!(prefs.useAIRefinement ?? prefs.postprocessAI),
      raycastPrompt: prefs.aiRefinementPrompt ?? prefs.postprocessAIPrompt,
      useOllama: !!(prefs.useLocalAI ?? prefs.ollamaEnabled),
      ollamaModel: prefs.ollamaModel,
      ollamaUrl: prefs.ollamaUrl,
    })

    // Store results for debugging and history
    try {
      await LocalStorage.setItem(LS_LAST_OCR_TEXT, text)
      await LocalStorage.setItem(LS_LAST_OCR_LANGUAGE, language)
    } catch {
      // Ignore LocalStorage errors
    }

    await Clipboard.copy(text)

    // Create a user-friendly snippet for the HUD
    const snippetRaw = text.replace(/\s+/g, " ").trim()
    const snippet = snippetRaw.slice(0, 80) + (snippetRaw.length > 80 ? "…" : "")
    if (autoPaste) {
      await Clipboard.paste(text)
      await showHUD(`✅ Copied and pasted: ${snippet}`)
    } else {
      await showHUD(`📋 Copied: ${snippet}\nPress ⌘V to paste`)
    }
    return text
  } catch (error) {
    const message = String((error as Error)?.message ?? error)
    // If the message matches cancellation, display an informational toast rather than failure.
    if (/cancelled/i.test(message)) {
      // Quietly exit on user cancel – no failure UX.
      return undefined
    }

    // Handle specific Tesseract installation errors
    if (/tesseract/i.test(message) && /ENOENT|not found|command not found/i.test(message)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tesseract Not Installed",
        message: "Install with: brew install tesseract",
      })
      return undefined
    }

    // Handle OCR.Space rate limiting
    if (/rate|429|too many|quota/i.test(message)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rate limited by OCR.Space",
        message: "Add your OCR.Space API key in Preferences or retry later.",
      })
      return undefined
    }
    await showToast({ style: Toast.Style.Failure, title: "OCR failed", message })
    return undefined
  } finally {
    // We intentionally keep the last screenshot for debugging purposes
    // Previous screenshots are cleaned up when new ones are captured
  }
}
