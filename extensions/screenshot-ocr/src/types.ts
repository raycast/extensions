// src/types.ts

/*
 * Types and interfaces for the Screenshot OCR - COPY/PASTE extension.
 */

/**
 * Configuration preferences for this extension.
 *
 * @remarks
 * These correspond to the `preferences` defined in `package.json`.
 *
 * @important Keep this interface in sync with `package.json` preferences.
 */
export interface ExtensionPreferences {
  /** Which OCR provider to use (future-proof). If omitted, defaults to "ocrspace". */
  ocrProvider?: "ocrspace" | "tesseract"
  /** Optional API key for OCR.Space. If omitted, the demo key is used and is heavily rate-limited. */
  ocrSpaceApiKey?: string
  /** Whether the mouse cursor should be visible in screenshots. */
  includeCursor?: boolean
  /** The language code for OCR (ISO 639-2, e.g. "eng"). */
  ocrLanguage?: string
  /** If true, paste immediately after copying (default true). */
  autoPaste?: boolean
  /** If true, apply heuristic post-processing to improve OCR text (default true). */
  postprocessText?: boolean
  /** If true and available, use Raycast AI for post-processing. */
  useAIRefinement?: boolean
  /** Optional prompt for AI post-processing. */
  aiRefinementPrompt?: string
  /** Enable using a local Ollama LLM for post-processing. */
  useLocalAI?: boolean
  /** Ollama model to use, e.g. "llama3.2:3b". */
  ollamaModel?: string
  /** Base URL for the local Ollama server. */
  ollamaUrl?: string

  // Backward-compatible aliases for older manifests
  screenshotCursor?: boolean
  postprocessHeuristics?: boolean
  postprocessAI?: boolean
  postprocessAIPrompt?: string
  ollamaEnabled?: boolean
}

/**
 * Options for capturing a screenshot.
 */
export interface CaptureOptions {
  /** Whether to show the cursor in the screenshot. Default: false. */
  includeCursor?: boolean
  /** File extension/format. Only `png` is supported by our flow. Default: "png". */
  format?: "png"
}

/**
 * Result of a screenshot capture operation.
 */
export interface CaptureResult {
  /** Absolute file system path to the captured image. */
  filePath: string
  /** The image format (e.g. "png"). */
  format: "png"
}

/**
 * The result from an OCR provider.
 */
export interface OcrResult {
  /** The best-effort, concatenated text recognized from the image. */
  text: string
  /** Optional confidence score in [0,1], if provided by the provider. */
  confidence?: number
  /** Language used by the OCR engine, if known. */
  language?: string
  /** Raw provider-specific response for debugging. */
  raw?: unknown
}

/**
 * A generic OCR provider.
 */
export interface OcrProvider {
  /**
   * Recognize text from the supplied image path.
   *
   * @param imagePath Absolute path to an image file on disk.
   * @param language Preferred 3-letter language code (e.g. "eng").
   * @returns Parsed OCR result.
   */
  recognize(imagePath: string, language?: string): Promise<OcrResult>
}

/**
 * Types for OCR.Space REST API response
 * https://ocr.space/ocrapi
 */
export interface OCRSpaceParsedResult {
  ParsedText?: string
  ErrorMessage?: string | string[]
  ErrorDetails?: string
  MeanConfidence?: number
}

export interface OCRSpaceResponse {
  IsErroredOnProcessing?: boolean
  ErrorMessage?: string | string[]
  ErrorDetails?: string
  ParsedResults?: OCRSpaceParsedResult[]
}
