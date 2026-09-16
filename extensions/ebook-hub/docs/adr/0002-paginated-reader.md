# ADR-0002: Paginated Reader Anchored on Blocks

- Status: Accepted
- Date: 2026-09-15

## Context

Raycast `Detail` has no API to read or set scroll position. A long chapter
rendered as one Markdown string cannot resume where the reader stopped, and
keyboard navigation inside it is limited to native scrolling.

## Decision

- Chapters are split into **blocks**: paragraphs separated by blank lines,
  with fenced code blocks kept whole.
- Blocks are grouped into **pages** by a word budget (preference *Words per
  Page*, default 350, clamped to 100–2000). Words are whitespace-delimited
  tokens; each CJK character counts as one word.
- A single block larger than the budget is split at sentence boundaries, then
  at word boundaries as a last resort.
- A **Reading Position** is `{ chapterIndex, blockIndex }`. The visible page is
  the page containing that block, so positions survive page-size changes.
- Only the current chapter is loaded into memory. Moving past a chapter
  boundary loads the neighbor chapter.
- Progress is written to `progress.json` next to the book after each
  navigation (see ADR-0004).
- Focus mode (preference) hides progress from the navigation title; the reader
  never uses the metadata side panel because it narrows the text column.

## Consequences

- Pages fit a screen without scrolling for typical text sizes; very large text
  settings may still scroll, which is acceptable.
- Pagination is a pure function (`src/domain/pagination.ts`) and is unit
  tested.
- Overall percentage uses chapter word counts stored in the manifest, so it
  never requires loading the whole book.

## Alternatives Considered

- **Whole chapter per Detail with native scroll** — no resume, no reliable
  progress. Rejected.
- **Page-number positions** — break when the page size changes. Rejected.
- **List with detail panel (one item per page)** — native `ctrl+j/k`
  selection, but the detail panel is narrow. Rejected for reading, reused for
  Command Mode.
