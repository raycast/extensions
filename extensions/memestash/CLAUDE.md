# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A [Raycast](https://raycast.com) extension (macOS-only) named **MemeStash** — a personal, curated image/meme library, modeled on Raycast's "Search Emoji & Symbols". Search by keyword, pick an image, and it pastes into the frontmost app. Two commands: `search-memes` (Grid) and `add-to-memestash` (Form).

## Commands & tooling

- `npm run dev` — development mode (`ray develop`); hot-reloads into the local Raycast app.

  **Beta targeting:** this machine has both `Raycast.app` (stable, `com.raycast.macos`) and `Raycast Beta.app` (`com.raycast-x.macos`) installed and develops against **Beta**. The `dev` script therefore sets `RAY_Target=x`, which makes `ray` build into Beta's dir (`~/.config/raycast-x/extensions`) and target Beta's bundle. For this to also hot-reload (the CLI notifies via a `raycast://` deep link), Beta is set as the system default handler for the `raycast://` scheme: `duti -s com.raycast-x.macos raycast` (revert with `com.raycast.macos`). Without `RAY_Target=x` the build dir and the notify target diverge. If you ever develop against stable instead, drop `RAY_Target=x` *and* repoint the `raycast://` handler back to stable.
- `npx ray build -e dist` — the build/typecheck gate (use this to validate).
- `npx ray lint` / `npx ray lint --fix` — lint / autofix.
- `npm run publish` — publish to the Raycast Store. Do **not** `npm publish`; a `prepublishOnly` guard aborts that path.

**Use npm, not pnpm or yarn.** The Raycast toolchain and store pipeline assume npm + a `package-lock.json`; pnpm's `node_modules` layout causes friction with `ray build`. There is no test runner — `ray build` and `ray lint` are the verification steps.

## Architecture

Raycast extensions are driven by the `commands` array in `package.json`. Each entry's `name` maps to `src/<name>.tsx` whose **default export** is the command component. Adding/renaming a command (or a preference) means editing `package.json`, not just the file. `raycast-env.d.ts` is **auto-generated** from `package.json` on build — never edit it by hand; it's gitignored.

The code is split into two halves that must stay separated:

- **Read/search/write the library** (`src/lib/`, platform-neutral): `types.ts` (data model), `manifest.ts` (pure, path-parameterized JSON I/O — no preference deps, to avoid an import cycle with `library.ts`), `library.ts` (resolves the configurable folder, lists memes in memory), `ingest.ts` (hash + measure + copy + upsert).
- **Insert into the frontmost app** (`src/lib/insert.ts`, platform-specific): the ONLY place that knows how an image is represented on the clipboard. Currently a thin `imageClipboardContent()` returning `{ file }`, consumed by the built-in `Action.Paste`/`Action.CopyToClipboard`. A future raw-data/AppleScript mode changes here and nowhere else.

### Data model

The library is **one folder of image files + a single `index.json` manifest** (the single source of truth). The folder is a configurable preference (`libraryPath`, default `~/Pictures/MemeStash`; `~` is expanded in `library.ts`). The manifest is **keyed by sha256 of the file's bytes**, NOT by filename — re-adding the same image is deduped, and IDs stay stable for a possible future iOS keyboard sharing this library.

```ts
type MemeEntry = { file: string; name: string; keywords: string[]; w: number; h: number; bytes: number; updatedAt: string };
type Manifest  = { version: number; items: Record<string /* sha256 */, MemeEntry> };
```

Portability is intentional: `file` is a **basename** (relative to the folder), so the whole library can move into iCloud Drive without rewriting the manifest; `version` is a migration hook. Keep new code platform-neutral, sync-friendly, and free of iOS code/deps. Search is the Grid's built-in fuzzy `filtering` over `title` + `keywords` (no search library needed at tens-to-hundreds of images). Dimensions come from macOS `sips` (no image-parsing dependency).

### Paste behavior caveat (verified by spike)

`Clipboard.paste({ file })` **inlines** the image in apps that support inline images (Messages, Notes) and **uploads/attaches** it in Slack — Slack has no inline-image-in-text concept, so an attachment is the best achievable there, regardless of clipboard flavor. Pasting the file (vs. raw bitmap data) also **preserves animated GIFs**, which is why `{ file }` is the chosen primitive. If you revisit this, change `insert.ts` only.
