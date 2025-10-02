// src/ocr.ts

/**
 * OCR provider implementations.
 *
 * @packageDocumentation
 */

import { readFile } from "fs/promises"
import type { OcrProvider, OcrResult, OCRSpaceResponse } from "./types"
import { toDataUrl } from "./screenshot"

/**
 * OCR.Space implementation of {@link OcrProvider}.
 *
 * @remarks
 * Uses the public OCR.Space REST API. If no API key is provided, falls back to the demo key (`helloworld`), which is
 * rate-limited and not suitable for production use.
 *
 * API docs: https://ocr.space/ocrapi
 */
export class OcrSpaceProvider implements OcrProvider {
  private readonly apiKey: string | undefined

  /**
   * Create a new provider instance.
   *
   * @param apiKey Optional OCR.Space API key.
   */
  constructor(apiKey?: string) {
    this.apiKey = apiKey && apiKey.trim().length > 0 ? apiKey.trim() : undefined
  }

  /** @inheritdoc */
  async recognize(imagePath: string, language = "eng"): Promise<OcrResult> {
    const buf = await readFile(imagePath)
    const dataUrl = toDataUrl(buf, "image/png")

    const body = new URLSearchParams()
    body.set("apikey", this.apiKey ?? "helloworld")
    body.set("language", language)
    body.set("isOverlayRequired", "false")
    body.set("scale", "true")
    body.set("OCREngine", "2")
    body.set("base64Image", dataUrl)

    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })

    if (!res.ok) {
      throw new Error(`OCR.Space HTTP error: ${res.status} ${res.statusText}`)
    }

    const json = (await res.json()) as OCRSpaceResponse

    if (json?.IsErroredOnProcessing) {
      const msg = json?.ErrorMessage || json?.ErrorDetails || "Unknown OCR error"
      throw new Error(`OCR.Space error: ${Array.isArray(msg) ? msg.join(", ") : String(msg)}`)
    }

    const parsed = Array.isArray(json?.ParsedResults) ? json.ParsedResults : []
    const text = parsed
      .map((p: unknown) => (p as { ParsedText?: string })?.ParsedText ?? "")
      .join("\n")
      .trim()

    // Confidence is not always present. We attempt to compute a simple average if available.
    let confidence: number | undefined
    try {
      const confidences: number[] = parsed
        .map((p: unknown) => (p as { MeanConfidence?: number })?.MeanConfidence)
        .filter((c: unknown) => typeof c === "number") as number[]
      if (confidences.length > 0) {
        confidence = confidences.reduce((a, b) => a + b, 0) / confidences.length / 100 // normalize to [0,1]
      }
    } catch {
      // ignore
    }

    return { text, confidence, language, raw: json }
  }
}
