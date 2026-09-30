# Ejection Seat

Ejection Seat is a macOS-only Raycast extension that identifies processes and file references which may prevent a mounted volume from ejecting.

## Architecture

- The command entry point is `src/find-ejection-blockers.tsx`.
- The command lists only real mounts beneath `/Volumes`, then runs the system `lsof` binary for every mount so the volume list can show a per-volume blocker count. The top-level view owns the scan data; the drill-in list is a pure view, and Refresh re-scans everything.
- Parse `lsof` field output (`-F0...`) rather than its column-oriented output. Preserve the PID, process name, user, descriptor, type, access, lock, and path fields.
- Resolve a PID to its application bundle with `/bin/ps -o pid=,comm=` (macOS prints the full executable path) and take the **outermost** `.app` in that path, so a nested helper still activates the app whose window the user can close. Use the bundle for `{ fileIcon }` and for Activate/Quit; a process with no bundle simply gets no app actions.
- Rank references by what `lsof` actually reports: a regular file open for writing outranks one open for reading, which outranks a mapped executable or a bare working directory. Sections are Likely Blockers / Other References / System Services.
- Keep the extension dependency-light. Prefer built-in macOS commands and Node APIs over a native helper or a new package.

## Safety and behavior

- This is a diagnostic tool. Describe results as **possible blockers**: they are a point-in-time snapshot, not proof that a process vetoed the eject request.
- Never force-eject a volume or terminate a process automatically. `diskutil eject` (never `unmountDisk force`) is the same request Finder makes, so a genuine blocker still refuses; Quit App uses a polite AppleScript `quit`, which lets the app prompt to save.
- Pass the bundle path to `osascript` through `on run argv`, never inside the AppleScript source text.
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
- **Eject Volume must never be one of the first two actions in a panel.** The auto Return/Command-Return slotting doesn't check shortcuts, so an `Eject Volume` in slot one or two fires on a bare Return. The "No Visible Blockers" and "Could Not Scan" empty-state panels put harmless actions (Show in Finder, Refresh Scan) first and keep Eject Volume in a later `Resolve` section, matching `BlockerActions`.
- **`ejectVolume` takes separate `onEjected` and `onFailed` callbacks — never collapse them.** A failed eject must not pop `BlockerList`: the failure toast names the vetoing process and offers to activate it, which is useless if the view showing that process's actions already navigated away. `onFailed` re-scans in place (`onRefresh`); only a genuine success pops.
- **The detail sidebar is user-toggleable, but still suppressed when there is nothing to show.** `BlockerList` owns `isShowingDetail` state and renders `isShowingDetail && blockers.length > 0` — keep the second half of that guard, or the empty/error views render an empty sidebar next to a `List.EmptyView`. Toggle Details is macOS-only, so it takes a plain `{ modifiers, key }` shortcut, not a platform-explicit object.
- **`Action.Push` snapshots the element it is given.** A pushed view fed data as a prop from the parent cannot be refreshed by revalidating the parent's hook. `BlockerList` therefore owns its own `usePromise(scanVolume, [volume])` and pops itself after a successful eject. *(The staleness itself is unconfirmed on-device; the self-owned scan is correct either way and removes the question.)*
- **Outside production, Raycast mounts the tree in strict mode and replays effects**, so every scan runs twice under `ray develop`. Duplicated `lsof` work seen while developing is the harness, not a defect — do not "fix" it.

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
