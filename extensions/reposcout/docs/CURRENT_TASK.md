# Current Task

> This file always reflects exactly what is being worked on right now. Rewrite it
> whenever work switches.

## Current Goal

**Store submission prep — code-complete; only screenshots + publish remain.**
v0.3.1 is complete, green (typecheck + lint + 158 tests), and documented. The
repository is in a clean, resumable state.

Store readiness (`docs/SUBMISSION.md`): `npx ray build -e dist` is clean and
`npx ray lint` **passes with no errors** — `author` is set to the Raycast handle
`gmcmanus`. Added root `CHANGELOG.md` (Raycast format) and a `metadata/` scaffold
for screenshots. **Remaining (needs the live Raycast app):** (1) add 3–6
screenshots to `metadata/` (delete `metadata/README.md`); (2) `npx ray publish`.

Recent changes:

- v0.3.1 — **Fixed "pick a folder, nothing happens."** A Raycast `Form` only
  saves on submit, so picking a folder and backing out discarded it. `AddRootForm`
  now commits on `FilePicker` `onChange` (guarded) + auto-pops with a toast; the
  store queues a follow-up scan if roots change mid-scan (`pendingRefresh`).
- v0.3.0 — **In-extension folder picker.** Folders can be chosen inside the
  extension via `Form.FilePicker` (stored in LocalStorage) — no preferences trip.
  Empty-state has **Add Folder…**; results view has **Manage Search Folders**
  (`⌘⇧F`). Scans the union of preference + in-app folders; the background command
  merges both. Pure logic in `preferences/roots.ts`; glue in `roots-store.ts`.
  See ADR-011.
- v0.2.0 — **Opt-in search roots.** No default whole-machine scan; empty roots ⇒
  the pick-folders prompt; hook and background command skip indexing (ADR-010).
- v0.1.1 — Fixed "Open in VS Code" (silent failure): editors resolved by bundle
  id, toast on failure (ADR-009).

**These changes should be confirmed live** — they involve Raycast-runtime
behavior (folder picker, LocalStorage, navigation push, app resolution) that unit
tests cannot fully verify.

The next intended goal is **live verification inside the Raycast app** (see
BACKLOG → Critical), which requires a Mac with Raycast installed and cannot be
completed in a headless environment.

## Current Files

No files are mid-edit. The most relevant files for the next task:

- `src/commands/SearchRepositories.tsx` — the view to verify live.
- `src/hooks/useRepositoryStore.ts` — cache hydrate + background refresh wiring.
- `src/commands/RefreshIndex.ts` — background command to verify runs on interval.
- `package.json` — manifest (commands, preferences) Raycast reads.

## Implementation Plan (for the next task: live verification)

1. On a Mac with Raycast: `npm install`, then `npm run build` (or `ray develop`).
2. Open **Search Repositories**; confirm cached-then-live results.
3. Exercise every action and both editors; confirm favorites/pins persist.
4. Confirm the background **Refresh Repository Index** runs on its interval.
5. Point at a large repo tree; confirm responsiveness.
6. File any issues into BACKLOG; fix regressions test-first.

## Known Risks

- Raycast runtime specifics (preferences typing, `environment.supportPath`,
  action behaviors) are unverified live — the core is unit-tested but the
  Raycast wiring is not.
- `ray build`/`ray lint` may flag Store-submission requirements not enforced by
  the local flat-config lint (ADR-006).
- `open(path, appName)` behavior for Terminal/editors should be confirmed on a
  real machine.

## Definition of Done (for the next task)

- Extension loads in Raycast; search returns results.
- All actions work; favorites/pins persist across reopen.
- Background refresh fires on interval.
- Any discovered issues captured in BACKLOG; regressions covered by tests.
- Docs updated to reflect live-verified status.

## Next Steps

See `docs/SESSION_SUMMARY.md` → "Suggested next prompt" for a ready-to-use
continuation prompt.
