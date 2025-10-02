// src/postprocess.ts

/**
 * Post-processing utilities for OCR text.
 *
 * @packageDocumentation
 */

import { AI, environment } from "@raycast/api"

/**
 * Heuristic cleanup of OCR text.
 *
 * - Normalizes smart quotes and dashes
 * - Collapses excessive whitespace
 * - Trims leading/trailing spaces on lines
 * - Fixes common ligatures
 */
export function applyHeuristics(text: string): string {
  let t = text
  // Normalize Unicode quotes/dashes
  t = t
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
  // Common ligatures
  t = t.replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl")
  // Normalize whitespace
  t = t
    .replace(/[\t\f\v\r]/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
  return t.trim()
}

/**
 * Post-process using Raycast AI (if available via Raycast Pro) with a custom prompt.
 *
 * @remarks
 * If Raycast AI is not accessible, this function resolves to the input text unchanged.
 */
export async function applyRaycastAI(text: string, prompt?: string): Promise<string> {
  if (!environment.canAccess(AI)) return text
  const sys =
    prompt?.trim() ||
    "Clean up OCR text: remove artifacts, fix spacing and line breaks, keep content unchanged otherwise."
  try {
    const out = await AI.ask(`${sys}\n\n--- OCR TEXT START ---\n${text}\n--- OCR TEXT END ---`)
    return (out || "").trim() || text
  } catch {
    return text
  }
}

/**
 * A subset of the Ollama generate API response we rely on
 * https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-completion
 */
interface OllamaGenerateResponse {
  response?: string
}

/**
 * Post-process using a local Ollama LLM.
 *
 * @param text Input OCR text
 * @param model Ollama model name, e.g., "llama3.2:3b"
 * @param url Base URL, default http://localhost:11434
 */
export async function applyOllama(text: string, model: string, url = "http://localhost:11434"): Promise<string> {
  try {
    const body = {
      model,
      prompt:
        "Clean up OCR text: remove artifacts, fix spacing and line breaks, keep content unchanged otherwise.\n\n" +
        text,
      stream: false,
    }
    const res = await fetch(`${url.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) return text
    const json = (await res.json()) as OllamaGenerateResponse
    const out = json?.response?.trim()
    return out && out.length > 0 ? out : text
  } catch {
    return text
  }
}

/**
 * Apply a sequence of post-processing steps.
 */
export async function applyPostProcessing(options: {
  text: string
  heuristics?: boolean
  useRaycastAI?: boolean
  raycastPrompt?: string
  useOllama?: boolean
  ollamaModel?: string
  ollamaUrl?: string
}): Promise<string> {
  let { text } = options
  if (options.heuristics !== false) {
    text = applyHeuristics(text)
  }
  if (options.useRaycastAI) {
    text = await applyRaycastAI(text, options.raycastPrompt)
  } else if (options.useOllama && options.ollamaModel) {
    text = await applyOllama(text, options.ollamaModel, options.ollamaUrl)
  }
  return text
}
