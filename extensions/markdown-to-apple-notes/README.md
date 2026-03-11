# Markdown to Apple Notes

A [Raycast](https://raycast.com) extension that converts Markdown from your clipboard to rich text and pastes it — optimized for Apple Notes.

Inspired by and based on [markdown-to-rich-text](https://github.com/raycast/extensions/tree/main/extensions/markdown-to-rich-text) by [ning_cao_cabeza](https://github.com/raycast/extensions/blob/main/extensions/markdown-to-rich-text/package.json), licensed MIT.

## The problem

Pasting rich text into Apple Notes produces wall-to-wall text with no visual breathing room around headings, making notes hard to skim.

## What it does

1. Reads Markdown from your clipboard
2. Converts it to rich text (HTML)
3. Adds whitespace before and after every heading
4. Pastes it directly into the frontmost app

## Differences from the original

- Adds `<p><br></p>` spacers before and after every heading for readability in Apple Notes
- Remaps `h4`–`h6` to `h3` (Apple Notes only supports Title / Heading / Subheading)
- Replaces the Contentful rich text library with [marked](https://marked.js.org) — lighter dependency, no Contentful account required
- Strips raw HTML from clipboard input before conversion

## Heading mapping

| Markdown | Apple Notes style |
| --- | --- |
| `# H1` | Title |
| `## H2` | Heading |
| `### H3` — `###### H6` | Subheading |

## Usage

1. Copy any Markdown text
2. Switch to Apple Notes (or any app)
3. Invoke the command: **⌥⌘M** (or open Raycast and search "Paste Markdown")

## Setup

**Requirements:** [Raycast](https://raycast.com) and [Node.js](https://nodejs.org)

```bash
git clone https://github.com/heynen/markdown-to-apple-notes
cd markdown-to-apple-notes
npm install
npm run dev
```

Keep the `npm run dev` terminal running — Raycast loads the extension automatically while it's active.

**Recommended hotkey:** `⌥⌘M` — set it in Raycast Settings → Extensions.

## Security

- Runs entirely locally — no network requests
- Raw HTML in clipboard source is stripped before conversion
- Inputs larger than 500 KB are rejected

## License

MIT — see [LICENSE](LICENSE).
