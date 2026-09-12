import { Client } from '@notionhq/client'

/**
 * The Notion SDK declares `BlockObjectRequest` but does not export it, so we
 * derive the block-request type from the public `pages.create` signature rather
 * than deep-importing an internal type.
 */
type BlockObjectRequest = NonNullable<
  Parameters<Client['pages']['create']>[0]['children']
>[number]

export const MAX_NOTE_LENGTH = 2000
export const MAX_NOTE_BLOCKS = 100

export function countNoteBlocks(note?: string): number {
  if (!note) return 0
  return note
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length
}

const isBareUrl = (line: string) => {
  try {
    const url = new URL(line)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Converts an optional free-text note into Notion block children for a page body.
 *
 * - Returns [] when the note is empty/undefined, so callers can omit `children`
 *   entirely and keep the no-note behaviour byte-for-byte identical.
 * - Each non-empty line becomes a paragraph block; a line that is only a bare URL
 *   becomes a bookmark block so the link renders as a rich preview in Notion.
 * - Limits are enforced at line boundaries: whole lines are kept until the budget
 *   is reached, and a line that would exceed it stops processing rather than being
 *   sliced mid-character (which could turn a URL into a broken bookmark). Caps the
 *   total to MAX_NOTE_LENGTH characters and MAX_NOTE_BLOCKS blocks to keep this a
 *   quick-capture note and stay within Notion's API limits (2000 characters per
 *   rich-text run, 100 blocks per request).
 */
export function buildNoteBlocks(note?: string): BlockObjectRequest[] {
  const trimmed = note?.trim()
  if (!trimmed) return []

  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const blocks: BlockObjectRequest[] = []
  let usedLength = 0

  for (const line of lines) {
    if (blocks.length >= MAX_NOTE_BLOCKS) break
    if (usedLength + line.length > MAX_NOTE_LENGTH) break
    usedLength += line.length

    const block: BlockObjectRequest = isBareUrl(line)
      ? {
          object: 'block',
          type: 'bookmark',
          bookmark: { url: line },
        }
      : {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: line } }],
          },
        }
    blocks.push(block)
  }

  return blocks
}
