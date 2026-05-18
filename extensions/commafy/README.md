# Commafy

A Raycast extension for formatting numbers inside any text selection on macOS — universal across every app, optimized for mixed **Japanese / English** content.

Commafy ships five commands. The four formatting commands share a fast, context-aware tokenizer so that decimals, phone numbers, `yyyy-mm-dd` dates, Japanese year tokens (`xxxx年`), alphanumeric identifiers (`SKU1234A`, `v1234`) and scientific notation (`1234e5`) are skipped by default. The fifth, `Normalize Full-Width Digits`, runs a separate character-level pass that converts full-width digits and numeric punctuation to half-width.

## Commands

| Command                         | What it does                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Commafy Selection**           | Inserts thousand-separator commas into integers in the selection. `1234567` → `1,234,567`                                   |
| **Decommafy Selection**         | Strips thousand separators back out. `1,234,567` → `1234567`                                                                |
| **Normalize Full-Width Digits** | Converts `０`-`９` to `0`-`9` and full-width numeric punctuation (`．，－＋／`) to half-width. `１，２３４．５` → `1,234.5` |
| **Commafy with 万/億**          | Formats integers using Japanese myriad units. `12345678` → `1234万5678`                                                     |
| **Preview Commafy**             | Shows a before/after preview with both Commafy and 万/億 variants side-by-side, then lets you paste the one you want.       |

## Default exclusions

These patterns are detected and left untouched by the formatting commands (Commafy / Decommafy / 万-億 / Preview). Each is toggleable in command preferences. `Normalize Full-Width Digits` runs a separate character-level pass that is not affected by these exclusions.

| Pattern                  | Example                                     | Why                                                                                     |
| ------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Decimal numbers          | `1234.56`                                   | Avoid mangling fractional values (toggleable for Commafy)                               |
| Already comma-formatted  | `1,234`                                     | Idempotent — running twice never produces `1,,234`                                      |
| Hyphen / slash dates     | `090-1234-5678`, `2026-05-18`, `2026/05/18` | Phone numbers and ISO / slash-style dates                                               |
| Japanese year tokens     | `2026年`, `1980年代`                        | Years rarely benefit from thousand-separator                                            |
| Alphanumeric identifiers | `SKU1234A`, `v1234`, `1234e5`               | Embedded in ASCII letters → likely an ID or version, not a value                        |
| Connector-style IDs      | `INV-1234567`, `SKU_12345`, `ABC/12345`     | `letter` + `[-_/]` + digits → treated as an identifier, not a number                    |
| Partial grouped numbers  | `1234,567`, `1234,5678`                     | Not a valid 3-3 grouping; leaving it alone avoids producing nonsense like `1,234,5,678` |

## Preferences (per command)

The `Commafy Selection` command exposes:

- **Minimum Digits** — minimum integer-part length before commas are inserted (default `4`).
- **Separator** — comma, space, underscore, or period (European style).
- **Format Decimals** — also commafy the integer portion of decimals.
- **Exclude Years** — skip `xxxx年` tokens (default on).
- **Exclude Hyphenated** — skip phone numbers / ISO dates (default on).
- **Normalize Full-width** — auto-convert full-width digits before formatting.

`Decommafy Selection` lets you choose which separator to strip. `Commafy with 万/億` adds an **Internal Commas** toggle to render `1,234万5,678` instead of `1234万5678`.

## How it works

1. The user selects text in any app and triggers a command (via Raycast or a global hotkey).
2. The command reads the selection through `getSelectedText()`.
3. The corresponding pure function in `src/lib/` applies a single dynamic regex: exclusion patterns are tried first, the transform pattern last.
4. The result is pasted back via `Clipboard.paste()`, replacing the selection. If paste is rejected (read-only or secure fields), the result falls back to the clipboard with a HUD instructing the user to paste manually.
5. The HUD reports how many tokens were actually changed.

## Examples

| Input                     | Commafy                                      | 万/億                                        |
| ------------------------- | -------------------------------------------- | -------------------------------------------- |
| `1234`                    | `1,234`                                      | `1234`                                       |
| `12345678`                | `12,345,678`                                 | `1234万5678`                                 |
| `-1500`                   | `-1,500`                                     | `-1500`                                      |
| `10000`                   | `10,000`                                     | `1万`                                        |
| `100000000`               | `100,000,000`                                | `1億`                                        |
| `100050001`               | `100,050,001`                                | `1億5万1`                                    |
| `2026年に売上1234567円`   | `2026年に売上1,234,567円`                    | `2026年に売上123万4567円`                    |
| `1234.56`                 | `1234.56` (skipped)                          | `1234.56` (skipped)                          |
| `INV-1234567`             | `INV-1234567` (skipped — connector ID)       | `INV-1234567` (skipped — connector ID)       |
| `090-1234-5678`           | `090-1234-5678` (skipped)                    | `090-1234-5678` (skipped)                    |
| `2026-05-18`              | `2026-05-18` (skipped)                       | `2026-05-18` (skipped)                       |
| `１２３４５` (full-width) | `１２３４５` _(enable Normalize Full-Width)_ | `１２３４５` _(enable Normalize Full-Width)_ |

## Project layout

```
.
├── package.json              # Raycast manifest (commands & preferences)
├── tsconfig.json
├── vitest.config.ts
├── .github/workflows/ci.yml  # lint + typecheck + test + build on every PR
├── CHANGELOG.md
├── assets/
│   └── icon.png
└── src/
    ├── commafy.ts            # Commafy Selection (no-view)
    ├── decommafy.ts          # Decommafy Selection (no-view)
    ├── normalize-digits.ts   # Normalize Full-width Digits (no-view)
    ├── commafy-japanese.ts   # Commafy with 万/億 (no-view)
    ├── preview-commafy.tsx   # Preview Commafy (view)
    └── lib/
        ├── commafy.ts
        ├── decommafy.ts
        ├── normalize-digits.ts
        ├── japanese-units.ts
        └── *.test.ts         # vitest unit tests (178 cases)
```

## Development

```bash
npm install
npm run dev          # registers the extension with Raycast (hot reload)
npm run test         # run the vitest suite once
npm run test:watch   # vitest in watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # ray lint
npm run audit        # npm audit --omit=dev (production-only)
```

### Security

- Production dependencies (the code bundled with the published extension) are audited via `npm run audit` and are kept free of advisories.
- Development dependencies (vitest, eslint) may surface advisories from time to time — those never reach the published extension. `package.json` uses `overrides` to keep them as healthy as possible without forcing breaking upgrades to the test toolchain.

`npm run dev` only needs to run once to register the extension with Raycast — after `Ctrl+C` it stays installed and the assigned hotkeys keep working. Re-run only after editing source code that needs to be reflected.

## Assigning a hotkey

For a true universal workflow, bind a global hotkey to each command in Raycast → **Settings → Extensions → Commafy** → individual command → **Record Hotkey**. A common scheme:

| Command             | Suggested hotkey |
| ------------------- | ---------------- |
| Commafy Selection   | `⌃ ⌥ ⌘ ,`        |
| Decommafy Selection | `⌃ ⌥ ⌘ .`        |
| Commafy with 万/億  | `⌃ ⌥ ⌘ M`        |
| Preview Commafy     | `⌃ ⌥ ⌘ P`        |

## License

MIT
