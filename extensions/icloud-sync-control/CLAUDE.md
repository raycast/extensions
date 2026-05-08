# Raycast Extension: iCloud Sync Control

## What this is

A Raycast extension that pauses and resumes iCloud Drive file syncing without disabling iCloud entirely. Built to be published to the Raycast Store.

Scaffolded fresh on 2026-05-07.

## Current state

**Working and verified:**
- `npm install` clean
- `npm run build` green (TypeScript compiles, both entry points)
- `npm run lint` green (only warnings are about "iCloud" capitalization — Apple's intentional brand casing; published Raycast extensions ship with these warnings, not blockers)
- SIGSTOP/SIGCONT mechanism verified end-to-end against real `bird` daemon (shell + Node)
- Icon is the final design: sky-blue rounded tile with white cloud + red prohibition slash. Truly transparent corners (verified with `magick identify`). Source SVG stashed at `assets/icon.svg`.
- Menu bar command and Toggle command both removed — see "Removed features" below.

**Not yet done — required before publishing:**
1. **Add `metadata/` screenshots** — at least 1, ideally 3, at 2000×1250. Suggested shots: the toggle HUD, the Raycast launcher row showing all three commands, before-and-after sync state.
2. **Update `author` field** in `package.json` — currently `"dustintchambers"` as placeholder. Must match the user's actual Raycast store handle. Confirm before publish.
3. **Confirm `{PR_MERGE_DATE}`** in CHANGELOG.md is left as-is — that literal token is what Raycast replaces during PR merge to raycast/extensions.
4. **`npm run publish`** — opens a PR against raycast/extensions repo.

## Architecture

```
src/
├── lib/icloud.ts         # ALL business logic lives here. Three exported functions:
│                         #   getStatus()  → "running" | "paused" via `ps -o state=`
│                         #   pauseSync()  → SIGSTOP to bird's PID via process.kill
│                         #   resumeSync() → SIGCONT to bird's PID
├── pause.ts              # no-view command, no-op if already paused, shows HUD
└── resume.ts             # no-view command, no-op if already running, shows HUD
```

The two commands are intentionally thin wrappers around `lib/icloud.ts`. Don't add logic to command files — Raycast store reviewers prefer the wrapper pattern, and it keeps state-manipulation code in one place.

## Removed features

Two commands that were in v1 have been intentionally removed:

- **Menu bar status command** (`src/menubar.tsx`, `mode: "menu-bar"`) — removed on 2026-05-08 because the live status display in the menu bar wasn't refreshing reliably across the polling interval. If re-adding: the file used `MenuBarExtra` + `useCachedPromise(getStatus)` from `@raycast/utils`. Removing it also let us drop the `@raycast/utils` dependency.

- **Toggle command** (`src/toggle.ts`, called `toggleSync()` in lib) — removed on 2026-05-08 in favor of explicit Pause/Resume only. Dustin's preference is intentional separation rather than smart-state-flip semantics. The `toggleSync()` function was also removed from `lib/icloud.ts` to avoid dead code that store reviewers might flag. If re-adding: it was a 7-line function that called `getStatus()` then dispatched to `pauseSync()` or `resumeSync()`.

## Key technical decisions

**Why `SIGSTOP`/`SIGCONT` instead of `launchctl bootout`/`bootstrap`:** the launchctl approach was the original v1. It does not work on macOS Sequoia (and late Ventura). `launchctl bootout gui/<UID>/com.apple.bird` returns error 150: "Operation not permitted while System Integrity Protection is engaged" because bird is loaded from `/System/Library/LaunchAgents/` and SIP now protects system-managed agents from user-domain bootout. Most "pause iCloud" guides on the internet are now broken for this exact reason. SIGSTOP/SIGCONT works because it doesn't go through launchd — we're signaling our own user-owned process directly. The kernel suspends bird in place; SIGCONT resumes from the exact same state.

**Why no sudo:** `bird` runs as the user (verified with `ps -p $(pgrep -x bird) -o user=`). You can always signal your own processes.

**Why `execFile` over `exec`:** `execFile` doesn't spawn a shell — fewer moving parts, and Raycast reviewers occasionally flag `exec` even when args are controlled.

**Why `pgrep -x bird` (exact match):** `-x` requires the process name to match exactly. Without it, `pgrep bird` could match other processes containing "bird" in their name. There's normally only one `bird` process per user on macOS.

**Why `ps -o state=` for status detection:** the BSD `ps` STAT field returns single-letter process states. `T` = stopped (SIGSTOP'd), `S` = sleeping (normal idle), `R` = running (active). Checking `startsWith("T")` is more robust than parsing other fields.

**Why throw on missing PID:** if `pgrep` finds no `bird` process, iCloud Drive is probably disabled, signed out, or in a broken state. Better to surface a clear error than silently no-op.

**Why `skipLibCheck: true` in tsconfig:** transitive type drift between `@raycast/api` and other Raycast packages (React 19 types) produces noise that's not in our code. Standard practice in shipped Raycast extensions; left in even after `@raycast/utils` was removed because future re-additions could re-introduce the noise.

## Pinned dependency notes

- `@raycast/api: ^1.104.15` (current latest as of scaffold)
- `@types/react: 19.0.10` (must be React 19; lower versions cause `bigint not assignable to ReactNode` errors with @raycast/api types)
- `@types/node: 22.13.10` (lower versions cause `SharedArrayBuffer not assignable to ArrayBuffer` errors)

If a future `npm install` upgrade breaks the build, the most likely culprit is one of these three. Don't downgrade @types/react or @types/node — that path leads back to the bigint/SharedArrayBuffer errors I already worked through.

## Scope

**Controls only:** `com.apple.bird` (iCloud Drive file sync daemon).

**Does NOT touch:** Photos, iCloud Keychain, iCloud Mail/Contacts/Calendar, Find My, or anything handled by `cloudd` or other daemons. This was an explicit decision — most users want only Drive paused, not their Photos library.

If a future request is "also pause Photos / iCloud Keychain," that means adding `com.apple.cloudd` control. Don't bake it into the existing toggle without a preference — surfacing it as a separate command or a preference checkbox is cleaner.

## Commands

```bash
npm run dev      # imports into Raycast in dev mode, hot-reloads on save
npm run build    # validates TypeScript + builds to dist/
npm run lint     # Raycast's combined ESLint + Prettier + manifest check
npm run fix-lint # autofix what's autofixable
npm run publish  # opens a store-submission PR against raycast/extensions
```

## Known surprises

- The Raycast linter warns about "iCloud" capitalization. Ignore — Apple's casing is intentional, store reviewers don't enforce title-case for brand names.
- A pause does NOT survive logout, reboot, or `bird` being killed by launchd. The new `bird` process gets a fresh PID in the running state. By design — pausing is session-scoped.
- `process.kill(pid, "SIGSTOP")` in Node sends the signal synchronously and resolves immediately — no need to `await` it. We don't actually wait for bird to confirm it's stopped, but `getStatus` reads `ps` afterward which shows the new state within milliseconds.
- After any change to `assets/icon.png`, you MUST quit Raycast entirely (`osascript -e 'tell application "Raycast" to quit'`) and relaunch before `npm run dev` will display the new icon. `ray develop` restarts alone don't flush the in-memory icon cache.

## Manual verification

To check sync state from the command line (matches what the extension reports):

```bash
ps -p $(pgrep -x bird) -o state=
# T → paused, S/R → running
```

To pause/resume manually (same as what the extension does):

```bash
kill -STOP $(pgrep -x bird)   # pause
kill -CONT $(pgrep -x bird)   # resume
```

## Next session starter checklist

When the user opens this folder in a fresh Claude Code session and wants to keep working, the first pass should be:

1. `npm install` to make sure deps are current
2. `npm run build` to confirm nothing rotted
3. Ask the user which of the publish-prerequisites (icon, screenshots, author handle) they want to tackle next
