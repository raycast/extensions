import type { CaptureInput, Visibility } from "@sniptide/sdk"

// Turns text from the clipboard or a selection into a paste. Pure, so the rules are tested without
// Raycast: the file name carries the language (Sniptide reads it from the extension), and the
// title is the text's first line.

const MAX_TITLE = 120
const MAX_FILE_NAME = 120

function looksLikeJson(text: string) {
  const trimmed = text.trim()
  if (!/^[[{]/.test(trimmed)) return false
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

// Text from a launcher names no language, so valid JSON is the one kind recognized here. The
// Create Paste form lets the reader name the file for everything else.
export function fileNameFor(text: string) {
  return looksLikeJson(text) ? "snippet.json" : "snippet.txt"
}

export function validFileName(name: string) {
  const value = name.trim()
  return (
    value.length > 0 &&
    value.length <= MAX_FILE_NAME &&
    !/[/\\]/.test(value) &&
    value !== "." &&
    value !== ".."
  )
}

function clip(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim()
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

// The first line that holds text, shortened to fit a list row.
export function titleFor(text: string) {
  const firstLine = text.split("\n").find((line) => line.trim()) ?? ""
  return clip(firstLine, 60) || "Untitled paste"
}

export interface CaptureOptions {
  visibility: Visibility
  title?: string
  fileName?: string
  collection?: string | null
}

export function captureFromText(text: string, options: CaptureOptions): CaptureInput {
  const title = clip(options.title ?? "", MAX_TITLE) || titleFor(text)
  const fileName = options.fileName?.trim() || fileNameFor(text)
  return {
    title,
    visibility: options.visibility,
    files: [{ name: fileName, content: text }],
    ...(options.collection ? { collection: options.collection } : {}),
  }
}
