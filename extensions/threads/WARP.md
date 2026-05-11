# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview and prerequisites

- Raycast extension for Threads: open feeds and activity, search, post via intent URLs, quick follow, and download media from a Threads post URL.
- macOS and Windows compatible per manifest. Requires the Raycast app and Raycast CLI (ray) on PATH.

## Commands

- npm install or npm ci — install dependencies
- npm run dev — develop the extension (ray develop)
- npm run build — build the extension (ray build -e dist)
- npm run lint — lint via @raycast/eslint-config
- npm run fix-lint — auto-fix lint issues
- npm run publish — publish via npx @raycast/api@latest publish
- Tests: none configured (no test framework or scripts present).

## Architecture (big picture)

- Manifest-driven: package.json uses the Raycast extension schema; commands there map 1:1 to TSX files in src/.
- Commands in src/:
  - feed.tsx, activity.tsx: close Raycast main window, open threads.net URLs based on dropdown args.
  - search.tsx: build Threads search URL from query/sort and open it.
  - quick-thread.tsx: construct post intent URL (src/lib/post-intent.ts) and open it (no-view).
  - new-thread.tsx: Form UI; validates content; builds post intent (src/lib/post-intent.ts) and opens; uses @raycast/api toasts.
  - quick-follow.tsx: build follow intent URL (src/lib/follow-intent.ts) and open it.
  - download-thread-media.tsx: parse a Threads post URL, resolve media via src/lib/download-media.ts, and stream downloads to the preference directory or ~/Downloads with progress toasts.
- Library modules in src/lib/:
  - post-intent.ts, follow-intent.ts: pure URL constructors for Threads “intent” endpoints.
  - download-media.ts: fetch media via external services (threadsphotodownloader API, fallback to DolphinRadar), deduplicate filenames, and show success/failure toasts with Show in Finder.
- Tooling: TypeScript (strict, JSX react-jsx); ESLint via @raycast/eslint-config; no tests configured.
- Preferences: The Download Threads Media command reads mediaDownloadPath (directory) from the manifest; defaults to ~/Downloads.
- Notable deps: threads-ts and @chrismessina/raycast-logger are present but not yet used.
- Raycast constraint: avoid any types.

## Extending the extension

- Add a new command by declaring it in package.json (commands array) and creating a matching src/command.tsx module; wire arguments and preferences in the manifest and consume them via LaunchProps/getPreferenceValues.

## Repo facts

- README: “Quickly post to Threads and follow users.”
- TODO.md (highlights): centralized logger; verbose logging toggle; OAuth sign-in/out via Raycast OAuth; adopt threads-ts; posting with attachments; user search + follow/unfollow; liked/saved views; recent posts views; post stats; welcome screen tips.

## Running a single command during development

- Start dev mode with npm run dev; then launch commands from the Raycast app UI under this extension.
