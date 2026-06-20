# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project

Raycast extension that fixes text typed with the wrong keyboard layout, converting between Thai and English. Targets macOS and Windows. The implementation in `src/convert-text.ts` is currently a stub — features are still being built.

## Commands

Package manager is pnpm (see `pnpm-lock.yaml`).

- `pnpm dev` / `ray develop` — run the extension locally in Raycast with hot reload
- `pnpm build` / `ray build` — production build
- `pnpm lint` / `ray lint` — lint with the Raycast ESLint config
- `pnpm fix-lint` / `ray lint --fix` — autofix lint issues
- `pnpm publish` — publish to the Raycast Store (do **not** run `npm publish`; the `prepublishOnly` hook intentionally blocks it)

No test framework is configured.

## Architecture

Single-command Raycast extension following Raycast's manifest-driven model:

- **`package.json`** is the extension manifest. The `commands` array declares each command; the `name` field (e.g. `convert-text`) must match a TypeScript file in `src/` (`src/convert-text.ts`). Adding a new command requires both a manifest entry and a new `src/` file.
- **`raycast-env.d.ts`** is auto-generated from the manifest — do not edit by hand. Change `package.json` and let Raycast regenerate it. Exposes typed `Preferences.*` and `Arguments.*` namespaces per command.
- The `convert-text` command uses `"mode": "no-view"` — it runs as a background action with no UI. The default export must be an `async function`, not a React component. It reads/writes clipboard via `@raycast/api`.

```ts
// ✅ Correct — no-view mode
export default async function Command() {
  const text = await Clipboard.readText();
  const converted = convert(text);
  await Clipboard.copy(converted);
  await showHUD("✅ Converted!");
}
```

## Project Structure

```
thai-english-text-converter/
├── src/
│   ├── convert-text.ts      # entry point — no-view command
│   └── utils/
│       └── converter.ts     # Thai↔EN keyboard mapping logic
├── assets/                  # extension icon (512x512 PNG)
├── raycast-env.d.ts         # auto-generated, do not edit
├── package.json             # also serves as extension manifest
└── CLAUDE.md
```

## Core Logic

Pure keyboard mapping — no translation, no API calls, fully offline.

Thai keyboard layout maps directly to English QWERTY positions and vice versa:
- Thai chars typed on QWERTY → map back to the English key at that position
- English chars typed on Thai layout → map back to Thai chars

Auto-detect direction based on character range (Thai Unicode block: `\u0E00–\u0E7F`).

Mapping table lives in `src/utils/converter.ts` and handles both directions.

## Conventions

- TypeScript `strict` mode on; `isolatedModules` enabled — use `export type` for type-only re-exports.
- Prettier: double quotes, semicolons, trailing commas, 80-char width, 2-space indent.
- ESLint extends `@raycast/eslint-config` — follow its rules, do not introduce custom ones.
- No `any` — use explicit types or generics.
- No React components — this extension uses `no-view` mode only.