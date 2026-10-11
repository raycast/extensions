# AGENTS.md — LaunchBar File Manager for Raycast

Read this file first when working in this repo. It captures everything a new
AI agent needs: setup, architecture, hard-won Raycast lessons, and workflows.

## What this is

A private Raycast extension (macOS only) that brings LaunchBar-style file
management into Raycast: keyboard-first browsing, multi-select, a Tab-driven
copy/move flow, Finder-selection transfer, Open With picker, and common file
ops. Two user-facing commands: **Browse Files** and **Transfer Finder
Selection**. Repo: `github.com/imed-ghomari/launchbar-file-manager`.

## Setup & everyday commands

- Requires Node 22+ and npm. Raycast must be installed and signed in.
- `npm install` — install deps.
- `npm run dev` (`ray develop`) — dev mode with hot reload. Then in Raycast:
  Import Extension → select this folder. **Dev extensions only work while
  `npm run dev` is running** — kill the terminal and the commands vanish.
- `npm run lint` (`ray lint`) — must pass with **0 errors, 0 warnings**
  before committing. `npm run fix-lint` autofixes.
- `npm run build` (`ray build -e dist`) — validates a distribution build.
- `npx ray bundle -o launchbar-file-manager.rayext` — production bundle.
  Double-click (or `open -a Raycast`) to install permanently; survives
  restarts with no terminal. `*.rayext` is gitignored — never commit it.
- `npm run publish` — opens the Raycast Store PR (see Publishing below).

## Architecture map

Single-view browser + pushed overlays. State that must survive navigation
lives in a module singleton, never in per-view `useState`.

| File | Role |
|---|---|
| `src/browse-files.tsx` | **Browse Files**: single-view drill browser (`currentPath` state, NOT a push stack, so Esc exits). Rows, selection UI, all file-op actions + forms. |
| `src/transfer-tree.tsx` | THE copy/move flow (pushed via Tab). Own `currentPath` state; `←/→` navigate, Enter confirms into highlighted folder (file rows target displayed folder), submenu forces Copy-vs-Move. `onDone(destDir)` lets the browser reveal results; unmount cleanup deselects. |
| `src/app-picker.tsx` | Open With picker (pushed). Merged `/Applications` + user + system roots, real app icons via `fileIcon`, fuzzy find, `open(file, appPath)`. |
| `src/finder-selection.tsx` | **Transfer Finder Selection**: loads Finder's selection, renders `TransferTree` with `manageBasket={false}` (root view — Cancel/pop exits). |
| `src/selection-store.ts` | Global X-basket (`useSyncExternalStore` singleton): toggle/add/remove/clear. Survives push/pop. Cleared on command open (exit = deselect), after paste, and on transfer cancel. |
| `src/fs-utils.ts` | `listDir` (dirs-first, skips unreadable), size/date format, `FAVORITES`, path helpers. Node-only, no Raycast imports. |
| `src/fuzzy.ts` | Custom fuzzy matcher (`fuzzyScore`): substring → subsequence abbreviations → Levenshtein typo tolerance (4+ chars). Node-only, unit-testable headlessly. |
| `src/copy-progress.ts` | Byte-progress copy/move (streamed, unique-dest, cross-volume fallback). Mutates a `Toast` for the progress bar. |
| `src/archive.ts` | ZIP via `ditto` (single) / `zip -r -y` (batch, staged through temp dir). |
| `src/trash-safe.ts` | `trash()` → AppleScript Finder fallback chain; missing paths count as done. Also used by copy-progress. |
| `package.json` | Extension manifest (commands, preferences, `platforms: [macOS]`, categories). |
| `README.md` | User-oriented docs. `GITHUB_STEPS.md` / `CHANGELOG.md` — maintainer docs. |

Key flows: X-toggle → global basket → Tab → `openTransfer()` (basket or highlighted item) → `TransferTree` from home/current per `transferStart` pref → Enter → Copy/Move submenu → progress toast → browser reveals dest → basket cleared.

## Raycast API lessons (do not relearn these)

- **Controlled `selectedItemId` re-centers the list.** Echoing `onSelectionChange` back into state re-renders on every arrow key and Raycast re-centers the row each time (destroys native edge-scrolling). Pattern used here: set the id only on navigation landings, release it via an effect once the target row exists (presence-gated, ~350ms), and ignore `null` selection events (loading gaps). See `highlightId` in both trees.
- **Reserved shortcuts** (lint flags `@raycast/no-reserved-shortcut`, action will be silently ignored): bare `Enter`, `Escape`, `Cmd+Enter`. Arrows/Space/Tab/single letters are fine.
- **No focus API.** Bare-key shortcuts fire view-globally, including while typing in the `⌘K` "Search for actions…" field. This is a platform constraint — do not try to scope shortcuts by focus; it can't be done.
- **Esc on a root view always exits** (reserved, not interceptable). Pushed views pop. The browser is single-view precisely so Esc exits; forms/transfer rely on native pop.
- **`useNavigation` has only push/pop** (no popToRoot). Cross-view communication goes through the store or `onDone` callbacks.
- **No scroll API.** Scrolling is native; the only influence is via selection (see first point).
- **Custom filtering** requires `filtering={false}` + `onSearchTextChange` (a listener implicitly disables native filtering otherwise). We always filter ourselves with `fuzzyScore`.
- **`List` has no sticky headers** — a `List.Section` header scrolls away; status info belongs in `navigationTitle` (static-ish; don't churn it per Store guidelines) or `searchBarPlaceholder` (always visible).
- **Every row that can be highlighted should carry `quickLook`** or the Quick Look panel sticks on the previous file.
- **`open(target, app?)`** accepts an app path string; app icons via `icon={{ fileIcon: appPath }}`.
- **`getSelectedFinderItems()`** throws when nothing is selected — catch it.
- **`LocalStorage`** persists the last folder for the home-vs-last startup setting. The basket is deliberately NOT persisted (exit = deselect).

## Shell/tool lessons (verified headlessly)

- `ditto -c -k` accepts only ONE source; batch zips use `zip -q -r -y` (symlinks preserved, spaces safe via argv).
- Never use `ditto --keepParent` here — it nests an extra parent folder; without it files land top-level. For folders, ditto archives *contents*, so stage through a temp dir to keep the folder itself.
- `trash` npm package fails cryptically on odd names/volumes — always go through `safeTrash`.
- Headless testing pattern: `esbuild <pure-ts-file> --bundle --platform=node --alias:@raycast/api=<stub>` then assert in node. Only works for modules without Raycast runtime imports (`fs-utils`, `fuzzy`, `archive`, `trash-safe`, `copy-progress`). GUI behavior (scrolling, focus, shortcuts) can only be verified by the user — say so explicitly.

## Git & release conventions

- Commit as `imed-ghomari <imed-ghomari@users.noreply.github.com>`, push to `main`.
- Commit messages: conventional, imperative (`feat:`, `fix:`, `docs:`). Keep them specific.
- User installs: tag `vX.Y.Z` (`git tag -a`, push tag), then
  `gh release create <tag> launchbar-file-manager.rayext --title ... --notes ...`
  with user-oriented notes. The `.rayext` is built fresh per release.

## Publishing (Raycast Store)

Manifest is ready (`author: imed`, MIT, `platforms: [macOS]`, categories,
keywords, lockfile committed). Remaining manual steps: ≥3 screenshots at
2000×1250 via Raycast Window Capture with *Save to Metadata*, a proper
512px icon (current one is a generated placeholder — see icon.ray.so), then
`npm run publish` (GitHub auth → auto-PR to `raycast/extensions` → review).

## Working style in this repo

- Verify with `tsc --noEmit`, `ray lint` (zero warnings), `ray build -e dist`.
- Test pure logic headlessly when possible; never claim GUI behavior you
  can't observe — ask the user to confirm on their machine.
- Prefer editing existing files over creating new ones. No emojis in code,
  UI strings, or commits. Keep user-facing copy in US English, Title Case
  for action titles (lint enforces).
- No unsolicited refactors; keep diffs scoped to the request.
