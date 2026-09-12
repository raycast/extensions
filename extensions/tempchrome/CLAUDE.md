# TempChrome (Raycast)

> **Icon note**: `assets/icon.png` is generated, not hand-edited. The source art is `scripts/icon.svg` (indigo gradient backdrop, three white arcs around a white core). Edit the SVG, then run `bun run icon` to re-render the 512×512 PNG. The script needs `rsvg-convert` (`brew install librsvg`).

Raycast extension for launching Chromium with temporary, isolated profiles. Two top-level commands:

- **Launch TempChrome** (`no-view`) — creates a fresh temp profile, spawns Chromium, shows a HUD. Bind to a hotkey for one-keystroke launch.
- **TempChrome** (`view`) — root List routing to Launch Now, Launch with Options…, Manage Temp Profiles…, and Install or Update Chromium….

The Install action runs a native TypeScript installer (`src/chromium/installer.ts`) rendered inside a Raycast `<Detail>` view (`src/install/InstallView.tsx`). It streams the Chromium snapshot into `~/Applications/Chromium.app` by default, reporting live progress and supporting `⌘.` cancellation. The install target directory comes from the **Chromium Install Directory** preference (default `~/Applications`); change it if you prefer `/Applications` or another location.

## UX Policy — toasts + shortcut hints are mandatory

Raycast doesn't expose a customizable status bar, so we lean on **toasts** (or HUDs) and **keyboard shortcuts** to communicate state and discoverability. Every user-triggered action in `raycast/src/` MUST wire up **both**:

1. **Feedback** — an animated → success/failure `Toast` for view commands, or `showHUD` for `no-view` commands. Failure paths go through `showFailureToast` from `@raycast/utils`. Bulk destructive ops must report quantitative detail (count, freed bytes) in the success toast.
2. **A keyboard shortcut** — every `<Action>` except the single ⏎-primary per `<ActionPanel>` must declare `shortcut={...}` using the project's convention table.

Additionally, every `<List>` / `<Form>` sets `navigationTitle` and uses `searchBarPlaceholder` as a status line where it helps (counts, totals). Root-list push actions expose their shortcut via `accessories={[{ tag: "⌘X" }]}` so users don't have to open the ⌘K panel to discover them.

**The full convention table, anti-patterns, and reference implementations live in the `raycast-ux-feedback` skill** (`.claude/skills/raycast-ux-feedback/SKILL.md`). When adding or modifying any action, load that skill and follow its checklist.

## Development

This extension uses [Bun](https://bun.sh) as its package manager and runner. Use `bun`, not `npm`, for every command below.

`package-lock.json` is the one exception. `ray publish` rejects an extension that has no npm lockfile, so the repo carries both `bun.lock` and `package-lock.json`. Do not delete `package-lock.json`. After any dependency change, refresh it with `npm install --package-lock-only` so it stays in step with `bun.lock`.

```sh
bun install        # install dependencies
bun run dev        # ray develop — live-reload in Raycast
bun run lint       # ray lint — validate package.json, ESLint, Prettier
bun run lint:fix   # ray lint --fix
bun run build      # ray build -e dist
bun run publish    # ray publish (requires a registered Raycast Store handle)
```

## Source Layout

```
src/
├── launch.ts                    # `launch` command entry — Quick Launch (no-view)
├── Tempchrome.tsx               # `tempchrome` command entry — root List view
├── preferences.ts               # getPreferences() wrapper around Raycast prefs
├── chromium/                    # Chromium binary + process inspection
│   ├── constants.ts             # BASE_CHROMIUM_ARGS, GOOGLE_ENV, ID_* generation params
│   ├── launcher.ts              # chromiumExists, clearQuarantine, launchChromium (async, 750ms liveness), ChromiumLaunchFailedError, createTempProfile
│   └── processes.ts             # getChromiumProcessArgs, isProfileInUse, isChromiumBinaryRunning (prefix match against resolved path)
├── profiles/                    # temp profile lifecycle + listing UI
│   ├── autoCleanup.ts           # registry + sweep (AUTO_CLEANUP_REGISTRY_KEY is local)
│   ├── listing.ts               # listProfiles, computeDirectorySize, formatBytes, ProfileInfo
│   └── ProfileList.tsx          # list component rendered by Tempchrome.tsx
├── options/                     # shared UI schema for launch options
│   ├── schema.ts                # LAUNCH_OPTIONS_SCHEMA + buildExtraArgs + types (single source of truth)
│   └── LaunchOptionsForm.tsx    # form rendered by iterating the schema
├── logs/                        # Chromium log viewer (tailer + parser + UI)
│   ├── LogViewer.tsx            # <List> split-view tail of <profileDir>/chrome_debug.log
│   ├── parser.ts                # parseChromiumLog, reconstructStructuredLine, row types
│   ├── tailer.ts                # stat-based 250ms polling loop + truncation/seek-skip
│   ├── dedupe.ts                # collapseConsecutive (×N badging), expandWithoutDedupe
│   ├── severity.ts              # severityMeta(level) → icon + tint + label
│   └── useProcessPresence.ts    # 2s interval wrapper around isProfileInUse
└── utils/
    ├── concurrency.ts           # mapWithConcurrency helper (bounded parallelism, preserves input order)
    ├── fs.ts                    # removePath helper (wraps fs.promises.rm recursive+force)
    └── reportError.ts           # reportError(context, error, { silent? }) — console.error + optional showFailureToast
```

Command entries (`launch.ts`, `Tempchrome.tsx`) stay at `src/` top-level because Raycast discovers them by matching each command's `name` in `package.json`. Everything else is grouped by domain.

## Logging

Chromium is spawned with `--enable-logging=stderr --log-file=<profileDir>/chrome_debug.log`, so every launch writes a per-profile log file inside the temp profile directory. The log's lifetime is tied to the profile, so `--auto-cleanup` removes it for free. To inspect the log, open **Manage Temp Profiles…** and press **⌘L** on any profile row to push the `LogViewer`, which live-tails the file using a 250 ms stat-based poll loop and renders structured vs. raw lines in a split `<List>` + Detail pane. The same two flags are also applied in `cli/tempchrome.sh`.

## Error reporting

- **Never call `console.error` directly** from code in `raycast/src/**`. Use `reportError(context, error, options?)` from `src/utils/reportError.ts`. It always logs, and by default surfaces a `showFailureToast` with `context` as the title so the user can see that something degraded. Background polling paths (tailer 250 ms stat loop, `ps` scraping, installer xattr side-channels) pass `{ silent: true }` to suppress the toast while keeping the log. The only legitimate `console.error` call sites are inside `reportError.ts` itself.
- **Sweep errors now surface as toasts.** `runSweepFireAndForget` and the mount-sweep in `ProfileList.tsx` both route outer and per-path failures through `reportError("Auto-cleanup sweep failed", error)` / `reportError("Auto-cleanup failed to remove a profile", error)`. The sweep is still fire-and-forget — a failing sweep does NOT block the launch's success HUD; its failure toast appears alongside the HUD.
- **Registry writes are serialized.** All mutations of the `tempchrome.auto-cleanup-registry` `LocalStorage` key flow through `updateRegistry(mutator)` in `src/profiles/autoCleanup.ts`, which chains mutations on a single in-module promise queue. This fixes the TOCTOU race where two rapid Quick Launches could clobber each other's auto-cleanup entries. `markForAutoCleanup`, `unmarkAutoCleanup`, and `performSweep` all use this primitive; no code should call `LocalStorage.setItem(AUTO_CLEANUP_REGISTRY_KEY, ...)` directly. `readRegistry` remains for read-only access.

## Launch and install hardening

- **Launch liveness window** — `launchChromium()` returns `Promise<void>` and resolves only after a `LAUNCH_GRACE_WINDOW_MS = 750` ms grace window. During that window it listens for the child's `exit`/`error` events; if Chromium dies within 750 ms (e.g. bad codesign, wrong arch, Gatekeeper block) the promise rejects with `ChromiumLaunchFailedError`. Only after the window elapses does it call `child.unref()` and detach for real. Every caller (`launch.ts`, `Tempchrome.tsx`, `profiles/ProfileList.tsx`) `await`s this so failure toasts replace the old silent-success HUD.
- **Resumable installer** — the installer writes to a revision-keyed part file `<tmpdir>/tempchrome-install-<platform>-<revision>.zip.part`. On the next run, `pruneStaleParts` deletes any part file that does not match the current `(platform, revision)`, then `runInstall` stats the part file, sets `resumeFromBytes = stat.size`, and issues `fetch` with `Range: bytes=N-`. The write-stream mode tracks the HTTP status: `206` → `"a"` (append, with `Content-Range` start-byte validation), `200` → `"w"` (truncate), `416` → delete + retry once without `Range`. The part file is intentionally **not** cleaned up in the `finally` block so cancelled/failed downloads can resume.
- **Destructive swap failure copy** — if the `rm(appBundlePath)` + `rename(sourceApp, appBundlePath)` swap fails, the thrown `InstallPathError`'s message is prefixed with `"Chromium bundle at <path> is no longer present. "`. `InstallView`'s failure-state markdown detects this prefix and surfaces a remediation blockquote telling the user to re-run Install to recover.

## Preferences

Extension-level (shared by all commands, top section of the Raycast preferences(prefs) pane):

- **Chromium Install Directory** — the directory that contains (or will contain) `Chromium.app` (default `~/Applications`; a leading `~` or `~/` is expanded to the user's home directory by `getPreferences()`). The bundle name is hard-coded to `Chromium.app`, so `getPreferences()` returns three derived fields — `installDir`, `appBundlePath` (`<installDir>/Chromium.app`), and `binaryPath` (`<appBundlePath>/Contents/MacOS/Chromium`) — for callers to consume.
- **Temp Profile Base Directory** — where temp profiles are created (default `/tmp/tempchrome_profile`).

Launch options (5 fields: `browsingMode`, `disableWebSecurity`, `disableExtensions`, `autoCleanup`, `customArgs`) are defined once in `src/options/schema.ts` and surfaced in **two independent places**:

- **Quick Launch TempChrome** command-level preferences(prefs) — rendered by Raycast in the preferences(prefs) pane, persistent across runs. Generated into `package.json` by `scripts/sync-options-schema.ts`; **do not hand-edit** the `launch.preferences` block in package.json.
- **Launch with Options** form (inside the `tempchrome` view command) — React `<Form>` built by iterating `LAUNCH_OPTIONS_SCHEMA`. Values reset to schema defaults every time the form opens; submit values do not write back to the preferences(prefs) pane.

The two surfaces share the **same UI definitions and the same flag-mapping** (`buildExtraArgs` in `src/options/schema.ts`), but hold **independent values**.

### Adding / editing a launch option

1. Edit `src/options/schema.ts` — append / modify a `LAUNCH_OPTIONS_SCHEMA` entry and, if the value shape changes, update the `LaunchOptionsValues` type.
2. Run any of `bun run dev` / `bun run lint` / `bun run lint:fix` / `bun run build` — the `pre-` hooks automatically invoke `bun run sync:options`, which rewrites `launch.preferences` in package.json. `ray lint` then regenerates `raycast-env.d.ts` so the TS types line up.
3. **Stage both files together** — `src/options/schema.ts` *and* `raycast/package.json`. The repo's `.githooks/pre-commit` runs `sync:options` via `ray lint --fix` and will abort the commit if `raycast/package.json` still has unstaged changes afterward; `.githooks/pre-push` enforces the same invariant against `HEAD` so drift never reaches the remote.
4. The React form picks up the new field on next render (no manual JSX change needed).
