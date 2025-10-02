// src/ocr-tesseract.ts

/**
 * Tesseract OCR provider implementation.
 *
 * @packageDocumentation
 */

import { execFile } from "child_process"
import { promisify } from "util"
import type { OcrProvider, OcrResult } from "./types"

const pexecFile = promisify(execFile)

/**
 * Uses the local `tesseract` binary to perform OCR.
 *
 * @remarks
 * Requires Tesseract to be installed and available on PATH (e.g., via Homebrew: `brew install tesseract`).
 */
export class TesseractProvider implements OcrProvider {
  async recognize(imagePath: string, language = "eng"): Promise<OcrResult> {
    // Send to stdout to avoid creating extra files
    const args = [imagePath, "stdout", "-l", language]
    try {
      const { stdout } = await pexecFile("tesseract", args)
      const text = (stdout || "").toString().trim()
      return { text, language }
    } catch (error) {
      const message = String((error as Error)?.message ?? error)
      throw new Error(`Tesseract failed: ${message}`)
    }
  }
}
