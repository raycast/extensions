# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Raycast extension in development mode (hot reload)
npm run build      # Build the extension
npm run lint       # Run ESLint via Raycast's lint wrapper
npm run fix-lint   # Auto-fix lint issues
npm run publish    # Publish to Raycast Store
```

There are no unit tests; all testing is done by running the extension in Raycast via `npm run dev`.

## Architecture

All logic lives in `src/`:

- **`trim-core.ts`** — the heart of the extension. Contains all shared logic: input resolution, the `cleanText` pipeline, and `runTrimCommand`. No React here.
- **`trim.ts`** — no-view command; calls `runTrimCommand("copy")`.
- **`trim-and-paste.ts`** — no-view command; calls `runTrimCommand("paste")`.
- **`preview-trim.tsx`** — view command (React); renders a `<Detail>` with original vs. trimmed diff using `usePromise`.

### `cleanText` pipeline (in `trim-core.ts`)

The pipeline applies transformations in order and returns the first transformed result (or original if nothing changed):

1. `normalizeLineEndings` — CRLF → LF
2. `stripBoxDrawingCharacters` — removes Unicode box-drawing chars copied from terminal UIs
3. `stripPromptPrefixes` — strips `$`/`#` shell prompt prefixes (majority-voting heuristic)
4. `repairWrappedURL` — rejoins line-wrapped URLs into a single URL
5. `quotePathWithSpaces` — wraps space-containing paths in double quotes
6. `transformIfCommand` — detects multi-line commands via scoring and flattens them to one line

### Aggressiveness and scoring

`transformIfCommand` uses a scoring system with thresholds per level:

- `low`: score ≥ 3
- `normal`: score ≥ 2
- `high`: score ≥ 1

Signals scored: backslash continuations, pipes/`&&`, `$` prompts, indented continuations, known command prefixes, all-command-line lines, path-like tokens.

### Input resolution

`resolveInput` tries sources in order (when `preferSelectionFallback` is enabled):

1. Selected text in frontmost app (`getSelectedText`)
2. First selected Finder item path (`getSelectedFinderItems`)
3. Clipboard text (`Clipboard.readText`)

### Preferences

Both preferences are defined per-command in `package.json` (not globally):

- `aggressiveness`: `"low" | "normal" | "high"` (default: `"normal"`)
- `preferSelectionFallback`: boolean (default: `true`)

## Code style

- Prettier: `printWidth: 120`, double quotes
- TypeScript strict mode, ES2023 target
- Functions return `string | null` where `null` means "no transformation applied" — this is the canonical pattern throughout `trim-core.ts`
