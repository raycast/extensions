# SF Symbol Intent Finder

Find SF Symbols by **intent**, not just by name.

SF Symbols are named after how they *look* (`arrow.uturn.backward`), not what you *mean* (`undo`). This extension searches the full catalog instantly by name/keyword **and**, in parallel, asks an AI model for symbols that match the *meaning* of your query — then merges the results into one grid.

Search `undo` and you'll get `arrow.uturn.backward`, `arrow.counterclockwise`, and friends, even though none of them contain the word "undo".

## How is this different from "SF Symbols Search"?

[SF Symbols Search](https://www.raycast.com/jffrykkn/sf-symbols-search) is a great name/keyword lookup. This extension differs in two ways:

- **Intent search.** A parallel AI search (bring your own free Gemini key) maps what you *mean* to real symbol names, and every suggestion is validated against the catalog so hallucinated names never appear. Without a key, it's still a fast local search.
- **Self-updating catalog.** Symbol names and availability are read from *your* macOS at runtime, glyph characters refresh weekly from Apple's release metadata, and icons are rendered locally by the OS. New SF Symbols show up as soon as your Mac knows them — no waiting for a bundled dataset to be updated.

## Features

- ⚡️ Instant local search over 9,000+ SF Symbols (name, keywords, categories)
- 🧠 Parallel AI intent search (Google Gemini Flash) for semantic matches
- ✅ Every AI suggestion is validated against the real catalog — no broken/hallucinated names
- 🖼 Renders the actual symbol glyph, tinted to your theme
- 📱 Shows each symbol's minimum iOS availability
- 🔄 Self-updating: symbol names come from your macOS, glyph characters refresh weekly from Apple's release metadata, and icons are rendered locally by your OS — new SF Symbols appear without an extension update
- ♻️ Results are cached locally (30 days) so repeat searches are instant and free
- ⌨️ Copy/Paste the symbol glyph or its name, with a configurable primary action

## Setup

AI intent search needs a Google AI Studio API key (the free tier is plenty for this):

1. Get a key at <https://aistudio.google.com/apikey>
2. Open the command, then add it under **Preferences → Gemini API Key** (or use the "Add a Gemini API key" hint shown while searching).

Without a key the extension still works as a fast local symbol search — only the AI intent suggestions are disabled.

## Actions

| Action | Shortcut |
| --- | --- |
| Paste Symbol | ⌥⇧V |
| Copy Symbol | ⌥⇧C |
| Copy Name | ⇧⌘C |
| Paste Name | ⇧⌘V |

The default (↵) action is configurable in Preferences.

## Development

```bash
npm install
npm run dev      # live-reload in Raycast
npm run build    # ray build -e dist — validates compile + manifest
npm run lint     # ray lint
```

> Note: "Copy Symbol"/"Paste Symbol" copy the actual SF Symbol glyph character, which only renders in apps that have the SF font available.

## Credits

- Symbol catalog data adapted from the MIT-licensed [`sf-symbols-search`](https://github.com/raycast/extensions/tree/main/extensions/sf-symbols-search) extension (© 2021 Raycast).
- Glyph character data from Apple's per-release SF Symbols metadata, as republished by the MIT-licensed [`MoOx/sf-symbols-svg`](https://github.com/MoOx/sf-symbols-svg).
- Interim symbol images (shown until the local render cache fills) from [`ndckj/sf-symbols`](https://github.com/ndckj/sf-symbols).

SF Symbols are © Apple Inc. and subject to the [Xcode and Apple SDKs Agreement](https://www.apple.com/legal/sla/docs/xcode.pdf) (System-Provided Images). This extension is not affiliated with Apple.
