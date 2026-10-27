# AI Agent Guidelines

Conventions for working on this codebase. Paths here are repo-relative on purpose — this
file ships to `raycast/extensions`, where an absolute path would publish someone's machine
layout and resolve for nobody.

## Project Overview

A **Raycast extension** in TypeScript that integrates with the Fathom API to search
meetings, teams, and team members, and to download meeting recordings.

**Key technologies**

- **Runtime**: Raycast (macOS/Windows)
- **Language**: TypeScript, `target`/`lib` ES2023, `strict`
- **API**: direct HTTP against `https://api.fathom.ai/external/v1` — there is **no SDK
  dependency**. `src/fathom/api.ts` owns every request.
- **UI**: `@raycast/api` v2, `@raycast/utils`
- **Build**: Raycast CLI (`ray`)
- **Storage**: Raycast `LocalStorage` for the meeting cache and in-flight download jobs

**Commands** (`package.json` → `commands`): `search-meetings`, `search-team-members`.

**AI tools** (`package.json` → `tools`, sources in `src/tools/`): `list-meetings`,
`get-meeting-details`, `list-team-members`.

**Preferences**: `fathomApiKey`, `exportDirectory`, `openMeetingsIn`, `notifyOnDownloadFinish`,
`useRaycastNotification`, `verboseLogging`, `strictRedaction`.

## Architecture

- **API layer** — `src/fathom/api.ts` (requests, auth, pagination),
  `src/fathom/downloads.ts` (the two-phase recording-download endpoints)
- **Cache layer** — `src/utils/cache.ts` (LocalStorage read/write, TTLs),
  `src/utils/cacheManager.ts` (singleton with pub/sub listeners)
- **Downloads** — `src/utils/downloadRecording.ts` (orchestration),
  `src/utils/downloadJobs.ts` (durable record of an in-flight generation),
  `src/actions/DownloadActions.tsx` (the action panel)
- **Hooks** — `src/hooks/useCachedMeetings.ts`
- **Types** — `src/types/Types.ts`
- **Commands** — top-level `src/*.tsx`
- **Actions** — `src/actions/*`

### Open in Fathom

"Open in Fathom" (⌘O, `src/actions/MeetingActions.tsx`) honors `openMeetingsIn`. On
`desktop` it opens `fathom://open-window/desktop_app/pages/calls/<callId>/details` — the link
fathom.video's own "open in desktop app" page hands the app — and falls back to the web URL when
no app with bundle ID `video.fathom.electron` is installed, the app scan fails, or the URL has
no call ID.

- **Desktop opening is macOS-only.** The check matches the macOS bundle ID, and Raycast reports
  Windows apps under `windowsAppId` instead, so on Windows it always opens the web. That is
  deliberate: neither the Windows app ID nor whether `fathom://` is registered there has been
  verified.

- The deep link takes the **call ID**, parsed from the web URL's `/calls/<id>` path. It is not
  the `recording_id`; the two are different numbers for the same meeting.
- `contentProtection` is deliberately omitted from the link, so opening a meeting cannot
  override the user's own Fathom content-protection setting.

### Caching

- TTL: **30 days** for meetings/summaries/transcripts, **6 hours** for action items
  (`src/utils/cache.ts`, `CACHE_CONFIG`).
- Staleness: 5 minutes. Cached meetings render immediately on launch; a fetch follows only
  if the cache is stale.
- Pagination: page 1 is fetched and displayed first, then pages 2–5 are background-fetched.
  They are accumulated across the loop and written to the cache **once**, after it finishes
  (`fetchRemainingPages`) — not merged page by page. The list uses Raycast's `pagination` prop
  (`pageSize: 20`) for infinite scroll.
- **Search only covers what is cached, and that is why ⌘L exists.** `filtering={false}` means
  the list filters itself, so the RENDERED list is the filtered set — and Raycast only fires
  `onLoadMore` when the user scrolls near the bottom of what is rendered. A query matching one
  meeting renders one row, nothing scrolls, and the corpus never grows. "Search Older Meetings"
  (⌘L) fetches the next batch on demand, from the list and from the empty view where scrolling
  is impossible by definition.
- Reaching further back is **manual on purpose**. An automatic version was removed: its effect
  depended on `isFetchingBackground`, so a failed pass re-fired it the instant that flipped
  false, and each pass walks up to 5 pages carrying `include_transcript=true`. Measured
  2026-09-17: three passes, nine 429s, an error screen. Do not make it automatic again without
  a cooldown and a rate-limit circuit breaker.
- A failed load-more must NOT set the view-level error. It used to, which swapped the list for
  an error view whose panel has no ⌘L action and which Refresh does not clear — so one 429
  removed the only way to retry.
- Go through the `cacheManager` singleton and the `useCachedMeetings()` hook; do not read
  the cache directly from a component.

### Recording downloads

Two phases, and the distinction matters for anything touching this code:

1. **Generation** — `POST /recordings/{id}/download` returns a `download_id`; the job is
   polled until a signed URL appears — ~30–40s for a 30–46 minute recording, longer for longer
   ones (`generationExpectation`). This poll runs in the **command's own event loop**, so it
   dies when Raycast unloads the command (not at the instant the window closes — it has been
   seen still polling 31s after dismissal). The `download_id` is persisted to LocalStorage
   immediately so re-triggering rejoins the same job instead of starting a new one, which is
   what the toast tells the user. The toast's Cancel (⌘.) aborts the poll through an
   `AbortSignal`; Fathom keeps the job, so a later download rejoins it.
2. **Transfer** — the signed URL is handed to a **detached** helper process from
   `@chrismessina/raycast-downloader`, which survives the command being unloaded.
   Recordings run 250–650 MB.

Adoption of an in-flight transfer reads the **runner's own status files**
(`listStatuses()`, matched on `meta.recordingId`) and takes a lease — not the LocalStorage
record, which only describes the generation window.

**The runner is a build artifact and it must be copied in.** `npm run copy-runner` copies
`dist/runner.bundle.js` out of the installed package to
`assets/raycast-downloader-runner.js`, and `build`/`dev` both run it first. Three rules:

- Copy the **bundle**, never `dist/runner.js` — the latter is `tsc` output that requires
  siblings which do not exist next to it in `assets/`.
- The asset filename must be exactly `raycast-downloader-runner.js`; the package looks for
  that name under `environment.assetsPath`. A wrong name still works under `npm run dev`
  and fails only in a Store build.
- `assets/raycast-downloader-runner.js` must be **committed**. The Store build never runs
  `copy-runner`, so an untracked asset ships from a local build but is missing for anyone
  who clones the repo.

## Build and test commands

```bash
npm install
npm run dev              # Raycast development mode
npm run lint             # ESLint via the Raycast CLI
npm run fix-lint
npm run build            # runs copy-runner, then ray build
npm run publish          # submit to the Raycast Store
npm run copy-runner      # refresh the bundled runner asset
npm run verify-runner    # fail if the asset differs from the installed package's bundle
```

`npm run publish` runs `verify-runner` first, so a stale runner asset blocks submission.

`ray build` does **not** typecheck. Run `npx tsc --noEmit` separately; it is a gate.

**There is no automated test harness.** Testing happens in Raycast. Do not add Jest,
Vitest, or test files.

## Code style

- **TypeScript**: `module` and `moduleResolution` are both **`Node16`** (required — the
  `@chrismessina/raycast-kit/bytes` subpath and other `exports`-map packages do not resolve
  under the scaffold's node10 default). `strict`, `isolatedModules`, `jsx: react-jsx`.
- **Prettier**: print width 120, double quotes, `.prettierrc`.
- **ESLint**: `@raycast/eslint-config`, flat config in **`eslint.config.mjs`**.
- Named imports, no default exports for utilities, no `require()`, no `any`.
- Never hand-define `Preferences` or `Arguments` — use the generated ambient types.
- Write JSDoc on exported functions; inline comments explain *why*. Not every existing
  export has one — add it when you touch the file rather than in a sweep.

**Toasts and shortcuts**

- A `Toast.Style.Failure` that reports an **error** carries a Copy Error action — use
  `showError` from `@chrismessina/raycast-kit` rather than hand-rolling it. Three existing
  toasts deliberately do not: "Download Canceled", "No members to export", and "No members
  to copy" are outcomes the user asked for or empty states, with no error to copy.
- Shortcuts use `Keyboard.Shortcut.Common` by semantics, or are platform-explicit
  (`{ macOS, Windows }`) when no `Common` constant fits.
- Toast copy never says "this window" — a toast is a detached HUD with no window attached.

## Security

- **API key**: a `password` preference (`fathomApiKey`), read via
  `getPreferenceValues<Preferences>()`. Never hardcode or log it.
- **Signed download URLs are bearer credentials.** They live ~24h and must never reach
  argv, a log line, a status file, LocalStorage, a toast, or any file on disk. As of
  `@chrismessina/raycast-downloader` 0.2.1 the URL reaches the runner on its stdin and curl
  on curl's stdin (`curl -K -`); `ps` is world-readable, which is why it is not an argument. Server-supplied strings that get logged (for example a job's
  `failure_reason`) are run through `redactString(s, { level: "strict" })` from
  `@chrismessina/raycast-logger` first.
- **Logging**: use `@chrismessina/raycast-logger`. A field named `code` is treated as
  potentially sensitive: a **numeric** value is zeroed (`404` → `0`), while a symbolic one
  (`"runner_failed"`, `"ENOENT"`) passes through as of 1.5.0. Download failures log the
  field as `errorCode` so a numeric code survives too.
- Meeting data, transcripts, and summaries may contain sensitive content — never log full
  API responses.
- Downloads and exports respect the user's `exportDirectory` preference (default
  `~/Downloads`).
- No analytics or telemetry.
