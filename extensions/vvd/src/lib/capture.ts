/**
 * Quick Capture writes through the platform API's typed content ops — the same
 * `content.apply` grammar every agent uses, never raw document internals. A card
 * takes prose as a text block (`card.addTextBlock`); a note takes its body
 * whole (`notes.setBody`). Pure: unit-tested with node --test.
 */

export type CaptureKind = "card" | "notes"

export interface CaptureKindOption {
  value: CaptureKind
  title: string
  /** What the body becomes, in the words the form shows. */
  bodyHint: string
}

export const CAPTURE_KINDS: readonly CaptureKindOption[] = [
  {
    value: "card",
    title: "Card",
    bodyHint: "Prose becomes the card's first text block.",
  },
  {
    value: "notes",
    title: "Note",
    bodyHint: "Plain text — the note's whole body.",
  },
]

export const DEFAULT_CAPTURE_KIND: CaptureKind = "card"

export function isCaptureKind(value: unknown): value is CaptureKind {
  return CAPTURE_KINDS.some((kind) => kind.value === value)
}

/** `{ op: "<type>.<action>", ...args }` — the open shape content.apply takes. */
export interface ContentOp {
  op: string
  [arg: string]: unknown
}

/** The card sidecar caps a text block; a longer capture is split across blocks. */
export const MAX_CARD_TEXT_BLOCK_CHARS = 20_000

/**
 * The ops that put `body` into a freshly created document of `kind`. An empty
 * body means no content call at all — the document alone is the capture.
 */
export function captureOps(kind: CaptureKind, body: string): ContentOp[] {
  const text = body.trim()
  if (!text) return []
  if (kind === "notes") return [{ op: "notes.setBody", body: text }]
  return splitParagraphs(text, MAX_CARD_TEXT_BLOCK_CHARS).map((chunk) => ({
    op: "card.addTextBlock",
    text: chunk,
  }))
}

/**
 * Split on paragraph boundaries so no chunk exceeds `max` characters. A single
 * paragraph longer than `max` is hard-cut — a capture that long is not prose
 * anyone will edit as one block anyway.
 */
export function splitParagraphs(text: string, max: number): string[] {
  if (text.length <= max) return [text]
  const chunks: string[] = []
  let current = ""
  for (const paragraph of text.split(/\n{2,}/)) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length <= max) {
      current = candidate
      continue
    }
    if (current) chunks.push(current)
    let rest = paragraph
    while (rest.length > max) {
      chunks.push(rest.slice(0, max))
      rest = rest.slice(max)
    }
    current = rest
  }
  if (current) chunks.push(current)
  return chunks
}
