# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands you’ll use most

- Install deps: `npm ci`
- Start dev (Raycast): `npm run dev` (opens `ray develop`)
- Build: `npm run build`
- Lint: `npm run lint`
- Auto-fix lint: `npm run fix-lint`
- Publish to Raycast Store: `npm run publish`
- Tests: none configured in this repo (no test runner set up)

Prereqs: Raycast app and the Raycast CLI (`ray`) available on PATH.

## High-level architecture

Type Snob is a single-command Raycast extension. It renders a searchable list of typographic characters grouped into sections and provides actions to copy/paste the character or copy its HTML entity.

- Manifest and scripts: `package.json`
  - Defines one command, `index` (title: “Copy Character”), in `mode: view`.
  - Scripts wrap Raycast CLI for build/dev/lint/publish.
- Entry command UI: `src/index.tsx`
  - Imports `characterSections` from `src/characters.ts` to drive the UI.
  - Renders a `List` with one `List.Section` per section; each character is a `List.Item`.
  - Search: `getKeywords` composes fuzzy-search keywords from the character’s glyph, stripped HTML entity, label tokens, and optional `keywords` array.
  - Details: `getDetailMarkdown` shows a markdown preview with the glyph, label, and optional example.
  - Actions: copy to clipboard, paste, and “Copy HTML” (Cmd+Opt+C) when an `html` entity is present.
  - Debugging: toggle the local `DEBUG` constant to `true` to render a `Detail` containing all HTML entities for quick visual validation.
- Data model and content: `src/characters.ts`
  - `interface Character` defines the data shape: `label`, `value` (glyph), `html` (entity), optional `example`, `keywords`, and optional `icons` with light/dark variants.
  - Character sets are organized into arrays (Quotes, Punctuation, Math and Numbers, Superscript & Ordinal, Symbols, Currency, Miscellaneous) and exported as `characterSections`.
  - Adding a character: append an item to the appropriate array; it will appear automatically in the UI. If you include `icons`, provide both light/dark PNGs (see Assets below). If `icons` are omitted, the glyph itself is used as the list title with the label as subtitle.
- Assets: `assets/`
  - Contains PNGs referenced by characters (e.g., opening/closing quote icons) and `command-icon.png` (extension icon referenced by `package.json`). Icons are referenced by filename; Raycast resolves light/dark variants when given `{ source: { light, dark } }`.
- Tooling
  - TypeScript config: `tsconfig.json` (strict, Node 16/ES2021, `jsx: react-jsx`).
  - ESLint: `.eslintrc.json` extends `@raycast` rules.
  - Prettier: `.prettierrc` (80-column width, double quotes by default).

## Development notes

- There is no state, networking, or persistence; the UI is fully data-driven from `characters.ts`.
- No test framework is set up; if you add one later, document how to run a single test here.
