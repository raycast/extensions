import type { CodeFile, Paste, PasteSummary } from "@sniptide/sdk"
import { messages } from "./messages"

// A fence longer than any run of backticks in the code, so the code can't close it early.
function fence(content: string) {
  let length = 3
  let start = content.indexOf("```")
  while (start !== -1) {
    let end = start + 3
    while (content[end] === "`") end++
    length = Math.max(length, end - start + 1)
    start = content.indexOf("```", end)
  }
  return "`".repeat(length)
}

// Raycast highlights a fenced block by the name after the fence. Plain text gets none.
function fenceLanguage(language: string) {
  const name = language.toLowerCase()
  return /^[a-z0-9+#-]+$/.test(name) && name !== "plaintext" && name !== "text" ? name : ""
}

export function fileMarkdown(file: Pick<CodeFile, "content" | "language">) {
  const marks = fence(file.content)
  return `${marks}${fenceLanguage(file.language)}\n${file.content}\n${marks}`
}

// A paste as Markdown for the detail view: one fenced block per file, named when there are several.
export function pasteMarkdown(paste: Pick<Paste, "files">) {
  if (paste.files.length === 1 && paste.files[0]) return fileMarkdown(paste.files[0])
  return paste.files.map((file) => `**${file.name}**\n\n${fileMarkdown(file)}`).join("\n\n")
}

export function lineCount(content: string) {
  let count = content.length && !content.endsWith("\n") ? 1 : 0
  for (let at = content.indexOf("\n"); at !== -1; at = content.indexOf("\n", at + 1)) count++
  return count
}

const VISIBILITY = {
  private: messages.private,
  unlisted: messages.unlisted,
  public: messages.public,
} as const

export function visibilityLabel(visibility: PasteSummary["visibility"]) {
  return VISIBILITY[visibility]
}

// The languages of a paste's files in one short label, such as "typescript" or "3 files".
export function languageLabel(paste: Pick<PasteSummary, "languages">) {
  const languages = paste.languages.filter((language) => language && language !== "plaintext")
  if (languages.length === 0) return null
  if (languages.length === 1) return languages[0] ?? null
  return `${languages[0]} +${languages.length - 1}`
}
