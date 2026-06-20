# Mermaid Clipboard

A minimal Raycast extension that renders the [Mermaid](https://mermaid.js.org/) diagram in your clipboard.

Copy Mermaid code anywhere, run **Render Mermaid from Clipboard**, and the diagram shows up in Raycast.

## Command

| Command | What it does |
| --- | --- |
| Render Mermaid from Clipboard | Reads Mermaid code from the clipboard and renders it as an image |

### Actions

- **Copy Image to Clipboard** — copy the rendered PNG
- **Open in Mermaid Live Editor** — open the diagram on mermaid.live
- **Copy Image URL** — copy the mermaid.ink image link (`⌘⇧C`)
- **Copy Source** — copy the original Mermaid code (`⌘S`)
- **Reload from Clipboard** — re-render the current clipboard (`⌘R`)

## Preferences

- **Diagram Theme** — `Auto` (matches Raycast's light/dark appearance), `Default`, `Dark`, `Neutral`, or `Forest`.

## How rendering works

Diagrams are rendered by [mermaid.ink](https://mermaid.ink/). The Mermaid code is
compressed and sent to that public service, which returns a PNG. This requires an
internet connection, and the diagram content leaves your machine. If you need fully
local rendering, swap the `fetch` in `src/render-mermaid.tsx` for a local
`@mermaid-js/mermaid-cli` (`mmdc`) call — the rest of the UI stays the same.

## Development

```bash
npm install
npm run dev     # loads the extension into Raycast
npm run build   # type-check and bundle
```
