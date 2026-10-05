# Ejection Seat

Ejection Seat is a macOS-only Raycast extension that identifies processes and file references which may prevent a mounted volume from ejecting.

## Architecture

- The command entry point is `src/find-ejection-blockers.tsx`.
- The command lists only real, browsable mounts beneath `/Volumes`, then runs the system `lsof` binary once per listed volume (covering its siblings, below) so the volume list can show a blocker count for each. **Both views show the same scan.** The volume list's tag and the drill-in's sections come from one `Scan` and are grouped by the same `sectionFor`, so the tag always describes what the user will find after drilling in: likely blockers and other references by count, system services by name (Spotlight reads "Spotlight Indexing", never "1 likely blocker"). Spotlight workers run as the user, are visible to `lsof`, and live for well under a second, so two independent scans routinely disagree — that is why the drill-in must not re-scan on open. The one exception: a drill-in opened while the volume list is mid-refresh was handed the previous scan, so it re-scans once on open (`isStale`).
- Mounts flagged `nobrowse` in `/sbin/mount` output (`Recovery`, an external boot disk's `Preboot`) are hidden from the list, matching Finder. Raycast's own Eject All Disks skips internal, system, snapshot, and simulator volumes since [2.6.0](https://www.raycast.com/changelog/macos/2-6).
- `diskutil eject` ejects the whole **physical** disk. `diskutil list -plist` maps each mount point to it (APFS volume → container → `APFSPhysicalStores[0]` → whole disk), and each volume's `lsof` scan also covers its **siblings**: the other `/Volumes` mounts on that disk, hidden ones included. Siblings come only from the `/Volumes` list, never the full mount table — an internal disk also carries `/`, and `lsof` must never scan the startup disk. If the topology lookup fails, each volume is scanned alone, as before.
- Parse `lsof` field output (`-F0...`) rather than its column-oriented output. Preserve the PID, process name, user, descriptor, type, access, lock, and path fields.
- Resolve a PID to its application bundle with `/bin/ps -o pid=,comm=` (macOS prints the full executable path) and take the **outermost** `.app` in that path, so a nested helper still activates the app whose window the user can close. Use the bundle for `{ fileIcon }` and for Activate/Quit; a process with no bundle simply gets no app actions.
- Rank references by what `lsof` actually reports: a regular file open for writing outranks one open for reading, which outranks a mapped executable or a bare working directory. Sections are Likely Blockers / Other References / System Services.
- Two actions hand off to other commands through `launchCommand`, each awaited inside a try/catch with a failure toast: **Eject All Disks** (`raycast/system-actions/eject-all-disks`, confirmed working on Raycast 2.6.0) and **Open Kill Process** (`rolandleth/kill-process`).
- Keep the extension dependency-light. Prefer built-in macOS commands and Node APIs over a native helper or a new package.

## Safety and behavior

- This is a diagnostic tool. Describe results as **possible blockers**: they are a point-in-time snapshot, not proof that a process vetoed the eject request.
- Never force-eject a volume or terminate a process automatically. `diskutil eject` (never `unmountDisk force`) is the same request Finder makes, so a genuine blocker still refuses; Quit App uses a polite AppleScript `quit`, which lets the app prompt to save.
- Pass the bundle path to `osascript` through `on run argv`, never inside the AppleScript source text.
- **A zero exit from `diskutil eject` is not proof.** After it returns, re-check that the mount point is no longer its own filesystem before reporting success; if it is, report a failure.
- **`diskutil` is the authoritative source, `lsof` is only a hint.** When an unmount fails, Disk Arbitration names the vetoing process — `Unmount was dissented by PID 123 (Foo)`. Parse that out of the failure text and surface it; it is the one answer that is not a guess.
- **Unprivileged `lsof` sees zero root-owned open files.** Verified 2026-08-18: `lsof -u root` returns nothing when Raycast runs it. Spotlight, Time Machine, `fseventsd`, and `revisiond` are therefore structurally invisible. Never let an empty result read as "this volume is clear" — say that root-owned references cannot be seen.
- Invoke executables with an absolute path and an argument array; never interpolate a mount point, PID, or path into a shell command.
- Keep a finite timeout and bounded output buffer around `lsof`, because an unhealthy volume can make filesystem inspection hang.
- `/Volumes` can contain stale empty directories. Confirm that a candidate directory has a different device ID from `/Volumes` before treating it as a mounted filesystem; otherwise `lsof` could accidentally scan the startup disk.
- Treat an `lsof` exit code of `1` as “no matching open files,” not as a command failure.

## Known macOS services

- `QuickLookUIService` is the shared Quick Look service. Advise closing Quick Look windows and Finder preview panes. Do not claim that the initiating app is knowable from this snapshot.
- `mdworker_shared`, `mdworker`, and `mds` are Spotlight indexing services. Advise waiting for indexing or excluding the volume from Spotlight; killing the worker is not a durable fix.

## Raycast UI invariants

- **The first two actions in a panel get Return and Command-Return automatically**, whatever explicit shortcuts they carry. Both `Activate App` and `Show in Finder` are conditional here, so the panel is ordered such that all four present/absent combinations leave a harmless action in those two slots; `Quit App` and `Eject Volume` live in a later `Resolve` section. Re-check this whenever an action's render condition changes.
- **Eject Volume must never be one of the first two actions in a panel.** The auto Return/Command-Return slotting doesn't check shortcuts, so an `Eject Volume` in slot one or two fires on a bare Return. The "No Visible Blockers" empty-state panel puts harmless actions (Show in Finder, Refresh Scan) first and keeps Eject Volume in a later `Resolve` section, matching `BlockerActions`; the "Could Not Scan" panel offers only Refresh Scan.
- **`ejectVolume` takes separate `onEjected` and `onFailed` callbacks — never collapse them.** A failed eject must not pop `BlockerList`: when `diskutil` names a dissenting process, the failure toast names it and, if it belongs to an app, offers to activate it — useless if the view showing that process's actions already navigated away. `onFailed` re-scans in place (`onRefresh`); only a genuine success pops.
- **The detail sidebar is user-toggleable, but still suppressed when there is nothing to show.** `BlockerList` keeps `isShowingDetail` in `useCachedState` (so a collapsed sidebar stays collapsed across launches) and renders `isShowingDetail && blockers.length > 0` — keep the second half of that guard, or the empty/error views render an empty sidebar next to a `List.EmptyView`. The action is titled for what it will do, "Hide Sidebar" / "Show Sidebar", never "Toggle". It is macOS-only, so ⌘⇧D is a plain `{ modifiers, key }` shortcut, not a platform-explicit object.
- **`Action.Push` snapshots the element it is given**, so the parent cannot push fresh data into an open `BlockerList`. It therefore opens on the parent's `Scan` as `initialScan`, keeps it in its own state, and on Refresh re-scans that one volume and hands the result up through `onScanned`; the parent shows, per volume, whichever scan has the later `startedAt` (`performance.now()`), so a slow full scan that began before the refresh cannot overwrite it. Do not use `usePromise(..., { execute: false })` for this: it forces `isLoading` to `false` even during `revalidate`, so a refresh would run with no spinner. `BlockerList` pops itself after a successful eject. A pushed view can outlive its volume, so `scanVolume` first confirms the volume is still mounted (otherwise it returns a "no longer mounted" error rather than pointing `lsof` at a leftover directory), then drops any sibling that is no longer mounted — a missing path makes `lsof` fail the whole scan — and returns the sibling list it actually scanned.
- **Outside production, Raycast mounts the tree in strict mode and replays effects**, so the top-level scan runs twice under `ray develop`. Duplicated `lsof` work seen while developing is the harness, not a defect — do not "fix" it.

## Validation

After changing TypeScript, the manifest, or dependencies, run:

```sh
npx tsc --noEmit   # ray build does NOT typecheck
npm run build
npm run lint
```

`tsconfig.json` sets `"types": ["node", "react"]` explicitly. Without it, TypeScript 6 fails to
pick up `@types/node` and `tsc --noEmit` reports `Cannot find name 'node:child_process'` — while
`ray build` still succeeds, because it does not typecheck.

Keep `package-lock.json` committed when dependencies change.

`eslint.config.mjs` is ESM and ignores the generated `raycast-env.d.ts`. Under `@raycast/api` 2.6.2, `ray lint` also lints those two files (2.0.5 and 2.6.0 did not; 2.6.1 was not tested): a CommonJS `eslint.config.js` fails `no-require-imports`, and `raycast-env.d.ts` fails `no-empty-object-type`.
