# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A [Raycast](https://raycast.com) extension that identifies the country of a phone number from its prefix — no API required. It exposes six commands registered in `package.json`:

| Command file | Mode | Purpose |
|---|---|---|
| `src/identify-phone-country.tsx` | `view` | Main UI — list view showing phone country identification |
| `src/format-phone-number.tsx` | `view` | Format a number in multiple formats (E.164, US, RFC 3966, digits-only) |
| `src/extract-phone-numbers.tsx` | `view` | Extract all phone numbers from selected text or clipboard |
| `src/lookup-country-code.tsx` | `view` | Search countries by name or dial code |
| `src/format-in-us-format.ts` | `no-view` | Background command to format a number in US format |
| `src/revome-formating.ts` | `no-view` | Background command to strip formatting from a number |

Shared logic lives in `src/utils/phone.ts` — phone parsing, prefix matching, and formatting helpers used across commands.

## Commands

```bash
# Local development (hot reload in Raycast)
npm run dev

# Production build
npm run build

# Lint
npm run lint
npm run fix-lint

# Publish to Raycast Store
npm run publish
```

> The extension uses `npm` (not Bun) — Raycast's CLI (`ray`) expects npm scripts.

## Architecture

- **Entry points:** each file in `src/` maps 1:1 to a command declared in `package.json` under `"commands"`. Raycast discovers them by filename.
- **View commands** (`.tsx`) export a default React component rendered by Raycast's UI layer (`@raycast/api`).
- **No-view commands** (`.ts`) run headlessly — they interact with the clipboard or show HUD notifications via `@raycast/api`.
- Shared utilities in `src/utils/phone.ts` — imported by multiple commands.
- No shared state, router, or build pipeline beyond `ray build`. TypeScript strict mode is enabled.

## Code Style

- Prettier config: `printWidth: 120`, double quotes (`singleQuote: false`)
- ESLint via `@raycast/eslint-config`
- TypeScript strict mode, target ES2023, `react-jsx` transform

## Raycast API — Clipboard

Core interaction pattern for all commands in this extension:

- `Clipboard.readText()` — reads clipboard as plain text
- `Clipboard.copy(text)` — writes back to clipboard
- `Clipboard.paste(text)` — inserts at cursor in frontmost app
- `getSelectedText()` — reads selected text from any app (alternative input source)

## Raycast API — Feedback

- `showHUD(title)` — preferred for no-view commands (closes Raycast, shows bottom bar message)
- `showToast({ style, title, message })` — for view commands; styles: `Toast.Style.Success / Failure / Animated`
- `showFailureToast(error)` from `@raycast/utils` — wraps error objects cleanly

## Raycast API — View Components

- `List` + `List.Item` with `accessories`, `actions`
- `ActionPanel` with `Action.CopyToClipboard`, `Action.Paste`
- `Detail` for a rich single-result view

## @raycast/utils — Hooks (view commands only, React context required)

- `useCachedState(key, initial)` — persists state across command runs (JSON-serializable)
- `useLocalStorage(key, initial)` — returns `{ value, setValue, removeValue }`

## No-View Command Canonical Pattern

```ts
const text = await Clipboard.readText()
if (!text) { await showHUD("No text in clipboard"); return }
const result = transform(text)
await Clipboard.copy(result)
await showHUD("Done")
```

## Static Data Strategy (No External API)

All phone number data is hardcoded — zero runtime dependencies beyond `@raycast/api` / `@raycast/utils`:

- International dial prefix map: `Record<string, CountryInfo>` where key = dial code string (e.g. `"1"`, `"44"`, `"33"`)
- Each entry shape: `{ name: string, flag: string, dialCode: string }` — flag as emoji via regional indicator (e.g. `"🇺🇸"`)
- ITU-T E.164 rules hardcoded: leading `+`, max 15 digits, no spaces/dashes in raw form
- Prefix matching: longest-prefix-wins — try `+1234`, then `+123`, then `+12`, then `+1`
