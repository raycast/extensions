# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A [Raycast](https://raycast.com) extension that converts documents, slides, spreadsheets, and images selected in Finder to PDF. It drives locally installed apps as conversion engines — Keynote, PowerPoint, Pages, Word, Numbers, Excel (via AppleScript), LibreOffice (`soffice --headless`), and `sips` for images. Nothing is bundled; at least one engine must be present.

## Commands

```bash
npm run dev        # Run in Raycast development mode (hot reload)
npm run build      # Build the extension
npm run lint       # Lint with Raycast's ESLint config
npm run fix-lint   # Auto-fix lint issues
npx tsc --noEmit   # Type-check without emitting output
npm run publish    # Publish to Raycast Store (not npm)
```

There is no test suite — CI runs typecheck and lint only.

## Architecture

- **`src/convert-to-pdf.ts`** — `no-view` command. Gets files selected in Finder, ranks capable engines per file (`rankBackendsForFile`), and tries them in order until one produces a PDF — a flaky native app falls back to the next engine. Shows toast progress/results. Respects preferences `openAfterConvertSingle` / `openAfterConvertBatch`.

- **`src/utils/backends.ts`** — all engine logic: detection (filesystem-based, never launches apps), per-extension capability sets, priority ranking, AppleScript generation, and `convertFile`. Key mechanics:
  - **Engine priority is format-native first** (`EXT_PRIORITY`): `.pptx` → PowerPoint before Keynote, `.docx` → Word before Pages, ODF → LibreOffice first. iWork formats (`.key`/`.pages`/`.numbers`) can only be opened by their own app — LibreOffice cannot.
  - **All AppleScripts share one skeleton** (`conversionScript`): wait for the opened document and bind it by name (open is async for non-native formats, a no-op for already-open documents, and apps may auto-create a blank startup document — count-based waiting mishandles all three; a count-based fallback still kicks in after 10 s if no name matches), capture export errors via `on error` and re-raise them after cleanup, close the doc, quit the app only if we launched it (quit is best-effort so its failure never masks a successful export). If the Node-side timeout kills `osascript`, a best-effort `closeDocScript` closes the abandoned document so retries and fallback engines aren't blocked.
  - **MS Office apps are sandboxed**: exporting to an arbitrary folder fails, so the PDF is written into the app's container (`~/Library/Containers/com.microsoft.{Powerpoint,Word,Excel}/Data/`) and then moved into place.
  - **Word and Excel have different save dictionaries**: Word `save as … file format format PDF`, Excel `save workbook as … filename … file format PDF file format`.
  - **LibreOffice runs with an isolated profile** (`-env:UserInstallation=…`) because `--convert-to` silently produces nothing when another instance holds the default profile lock, and converts into a temp outdir so the caller controls the output name.
  - An existing target PDF is moved aside before every conversion and restored on failure — this also stops a stale PDF from masking a silent engine failure; `convertFile` throws unless a fresh output file exists.
  - Batch output names are de-duplicated (`report.docx` + `report.xlsx` → `report.pdf` + `report (xlsx).pdf`).

- **`src/setup.tsx`** — `view` command ("Setup Conversion Engines"). Checklist UI that shows which engines are detected, lets users pick a preferred engine per category, and guides them through installing LibreOffice.

- **`src/utils/preferences.ts`** — shared `LocalStorage` loading of the per-category preferred-engine keys, used by both commands.

Extension preferences and command metadata are declared in `package.json` under `"commands"` and `"preferences"` — Raycast reads these at build time.

## Key constraints

- macOS only (`"platforms": ["macOS"]` in `package.json`).
- `soffice` resolution order: `which soffice` via `spawnSync`, then `/Applications/LibreOffice.app/Contents/MacOS/soffice`, `/opt/homebrew/bin/soffice`, `/usr/local/bin/soffice`.
- PDFs are written to the same directory as the source file.
- The main window is closed immediately via `closeMainWindow()` so conversion runs in the background without blocking Raycast.
- App detection is filesystem-based on purpose — `osascript` probing can launch apps as a side effect. "Creator Studio" app names are App Store editions of the same apps.
- Generated AppleScripts can be syntax-checked without running a conversion via `buildAppleScriptForType` + `osacompile`.
