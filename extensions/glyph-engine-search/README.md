# Glyph Engine Search

Search SF Symbols, emoji, and Unicode from Raycast.

## Commands

- `Search Glyphs` searches SF Symbol names, Apple keyword aliases, emoji names, and Unicode scalar names.

## Actions

- Copy the selected item: SF Symbol name, emoji character, or Unicode character.
- Paste the selected item into the frontmost app.
- Copy SwiftUI, UIKit, or AppKit snippets for the selected symbol.
- Copy Unicode code points for emoji and Unicode results.

## Development

```sh
npm install
npm run build:data
npm run dev
```

The search index is generated from `GlyphEngine/Resources/CoreGlyphsData`, `unicode-emoji-json`, `unicode-name`, and `unicode-category`. Run `npm run build:data` after refreshing those inputs.
