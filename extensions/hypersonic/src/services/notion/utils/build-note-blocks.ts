import { Client } from '@notionhq/client'

/**
 * The Notion SDK declares `BlockObjectRequest` but does not export it, so we
 * derive the block-request type from the public `pages.create` signature rather
 * than deep-importing an internal type.
 */
type BlockObjectRequest = NonNullable<
  Parameters<Client['pages']['create']>[0]['children']
>[number]

const MAX_NOTE_LENGTH = 2000
const MAX_NOTE_BLOCKS = 100

const isBareUrl = (line: string) => /^https?:\/\/\S+$/.test(line)

/**
 * Converts an optional free-text note into Notion block children for a page body.
 *
 * - Returns [] when the note is empty/undefined, so callers can omit `children`
 *   entirely and keep the no-note behaviour byte-for-byte identical.
 * - Each non-empty line becomes a paragraph block; a line that is only a bare URL
 *   becomes a bookmark block so the link renders as a rich preview in Notion.
 * - Capped to MAX_NOTE_LENGTH characters and MAX_NOTE_BLOCKS blocks to keep this a
 *   quick-capture note and to stay within Notion's API limits (2000 characters per
 *   rich-text run, 100 blocks per request).
 */
export function buildNoteBlocks(note?: string): BlockObjectRequest[] {
  const trimmed = note?.trim()
  if (!trimmed) return []

  return trimmed
    .slice(0, MAX_NOTE_LENGTH)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, MAX_NOTE_BLOCKS)
    .map(
      (line): BlockObjectRequest =>
        isBareUrl(line)
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
    )
}
