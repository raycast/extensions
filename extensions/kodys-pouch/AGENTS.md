# Kody's Pouch

Raycast window into Kody inventory. Search Tools and Skills, pick to paste a Mention. Kody is the source of truth; this extension does not read disk skills or write stubs.

Keep this file brief. Put task-specific guidance behind a pointer.

## Gotchas

- Last-good: missing skills package is Tools-only, not an error. A failed fetch keeps last-good and shows a visible error. Last-good paints immediately, then refreshes. Cache rewrites only after a clean merge.
- Catalog lists (list-skills, list-capabilities, package-tools) stay behind a 7-day `withCache`. Refresh Pouch (⌘R) clears all three then revalidates; last-good stays on screen.
- Pins and Recents live in LocalStorage, not last-good Cache. Refresh Pouch revalidates inventory only.
- Data: Raycast `useCachedPromise` + `Cache`, not TanStack Query.

## Guardrails

- Keep the Discovery Package `pouch` webhook URL in a Raycast password preference. The URL is a credential and stays out of chat.
- Keep README media in `media/`, Store screenshots in `metadata/`, and required-preference setup in `help.md`.

## Language

Domain terms or Mention shape: read `CONTEXT.md`.
Recent, Pin, or empty-query layout: read `docs/recent-and-pin.md`.
Discovery Package decisions: read `docs/adr/`.
