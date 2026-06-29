# Clipboard Renderer

A minimal Raycast extension that renders whatever's in your clipboard — currently [Mermaid](https://mermaid.js.org/) diagrams and [LaTeX](https://www.latex-project.org/) math.

Copy Mermaid code or a LaTeX formula anywhere, run **Render from Clipboard**, and the result shows up in Raycast. The command auto-detects which format the clipboard holds.

## Command

| Command | What it does |
| --- | --- |
| Render from Clipboard | Reads Mermaid code or a LaTeX math expression from the clipboard and renders it |

### Format detection

If the clipboard starts with a Mermaid diagram keyword (`graph`, `flowchart`, `sequenceDiagram`, …) it is rendered as a Mermaid diagram. Otherwise it is treated as a LaTeX math snippet. Surrounding math delimiters (`$…$`, `$$…$$`, `\(…\)`, `\[…\]`) are stripped automatically, so both `E = mc^2` and `$E = mc^2$` work.

### Actions

- **Copy Image to Clipboard** — copy the rendered PNG (Mermaid only)
- **Open in Mermaid Live Editor** — open the diagram on mermaid.live (Mermaid only)
- **Copy Image URL** — copy the mermaid.ink image link (Mermaid only, `⌘⇧C`)
- **Copy Source** — copy the original clipboard text (`⌘S`)
- **Reload from Clipboard** — re-render the current clipboard (`⌘R`)

## Preferences

- **Diagram Theme** — `Auto` (matches Raycast's light/dark appearance), `Default`, `Dark`, `Neutral`, or `Forest`. Applies to Mermaid diagrams; LaTeX formulas follow the Raycast appearance automatically.
- **Local Mermaid CLI** — optional override. [`mmdc`](https://github.com/mermaid-js/mermaid-cli) is auto-detected on your `PATH`, so you normally don't need to set this. Provide the absolute path only if auto-detection fails. Find it with `which mmdc`.

## How rendering works

**LaTeX** math is rendered locally by Raycast's built-in LaTeX support (Raycast
1.81+) — the formula never leaves your machine and works offline.

**Mermaid** diagrams are rendered locally when possible, otherwise on the web:

- **Local CLI (preferred)** — if [`mmdc`](https://github.com/mermaid-js/mermaid-cli)
  (`npm install -g @mermaid-js/mermaid-cli`) is found on your `PATH` — resolved
  through your login shell, so `nodenv`/`nvm`/Homebrew installs are picked up —
  the diagram is rendered fully on-device, offline. `mmdc` drives a headless
  browser internally, so it is too heavy to bundle into the extension; hence it
  stays an auto-detected, user-provided binary rather than a shipped dependency.
- **mermaid.ink (fallback)** — if no local `mmdc` is found, the code is sent to
  the [mermaid.ink](https://mermaid.ink/) public service, which returns a PNG.
  This needs an internet connection and the diagram content leaves your machine,
  so the rendered view shows a warning when this fallback is used.

## Development

```bash
npm install
npm run dev     # loads the extension into Raycast
npm run build   # type-check and bundle
```
