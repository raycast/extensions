# Actions Menu Cleanup

**Date:** 2026-05-25
**Status:** Approved for implementation

## Problem

The per-task `ActionPanel` in `src/tasks.tsx` has grown to 17 actions across the primary block and one trailing `ActionPanel.Section`. Three issues:

1. Several actions duplicate functionality reachable through Raycast root commands (e.g. New Task / Quick Add).
2. Priority bumps (⌘↑ / ⌘↓) overlap with the Set Priority submenu, with no clear win.
3. Active ↔ Completed ↔ Archived scope toggles live inside the panel, mixing "act on this task" with "switch which view I'm in".

Adjacent: the Active-filters list section uses a `Color.Blue` filter icon that competes visually with priority squircles.

## Goals

- Reduce the per-task action panel to actions that operate **on the task or the current view**.
- Move cross-scope navigation (Active / Completed / Archived) out to top-level Raycast commands.
- De-emphasize the active-filter list section's icon.

## Non-goals

- Restructuring how filters are computed or applied.
- Changing the priority squircle system, the parser, or `src/io/todoFile.ts`.
- Adding new view presets or new sort modes.

## Design

### Per-task action panel (17 → 11)

`TaskListItem` in `src/tasks.tsx` renders this panel. New shape:

The panel uses **three `ActionPanel.Section` blocks** in this order: primary task actions, filters, view utilities. Section titles are omitted (Raycast renders an unlabeled divider between sections).

**Section 1 — Primary actions**

1. Complete Task / Mark Incomplete *(default; no shortcut)*
2. Edit Raw — ⌘E
3. Set Priority — ⌘P *(submenu, A–Z + Clear)*
4. Delete Task — ⌃X *(destructive)*
5. Archive Completed — ⌘⇧A

**Section 2 — Filters**

6. Filter by Tag — ⌘F *(submenu, current task's `+project` / `@context` tags only)*
7. Add Filter — ⌘⇧F *(submenu, all known tags excluding already-active filters)*

**Section 3 — View utilities**

8. Open `todo.txt` — ⌘O
9. Reload — ⌘R
10. Show / Hide Detail — ⌘D
11. Group by Priority / Date — ⌘⇧G

**Removed**

- `New Task` (⌘N push) — Quick Add command (`quick-add`) is the canonical entry point for creating tasks.
- `Bump Priority Up` (⌘↑) and `Bump Priority Down` (⌘↓) — superseded by the Set Priority submenu; the bump handlers (`onBumpUp`, `onBumpDown`) and their props can be deleted.
- `Save '<preset>' as Quicklink` (⌘⇧Q) — unused; users who want fast access to a preset can create a Raycast quicklink from the root command. Simpler menu beats a power-user shortcut.
- `Show Completed Tasks` / `Show Active Tasks` toggle (⌘⇧C) — replaced by the new `show-completed` command.
- `Show Archived Tasks` (⌘⇧H) — replaced by the new `show-archived` command.

The handler props passed into `TaskListItem` (`onNew`, `onBumpUp`, `onBumpDown`, `onToggleCompletedView`, `onShowArchived`) and their parent definitions are removed wherever they become unreferenced.

### New top-level commands

Two new entries in `package.json` under `commands`, each backed by its own `src/*.tsx` entry file:

```
src/show-completed.tsx   → renders the existing tasks list, pre-set to preset="completed"
src/show-archived.tsx    → renders ArchiveView directly (reads done.txt)
```

Both are thin wrappers — they import the same view components already in `src/tasks.tsx` and `src/components/` (or factor out a small shared shell if needed) and seed initial state. No domain or IO changes.

Naming in `package.json`:

```
"name": "show-completed",  "title": "Show Completed Tasks",  "mode": "view"
"name": "show-archived",   "title": "Show Archived Tasks",   "mode": "view"
```

The existing `tasks` command keeps its `preset` dropdown unchanged (including the `Completed` option) — users can still reach completed via the dropdown if they prefer; the new top-level command is the one-step alternative.

### Empty states and archive view

Apply the same "fully command-driven scope switching" principle to every `ActionPanel` in `src/tasks.tsx`:

- **Completed empty state** (around `tasks.tsx:380`): drop `Show Active Tasks`. Keep `Open Preferences`.
- **Filtered empty state in completed view** (around `tasks.tsx:402`): drop `Show Active Tasks`.
- **Filtered empty state in active view** (around `tasks.tsx:423`): drop `Show Active Tasks`. Keep `Clear Tag Filters` — that is a within-scope action.
- **Truly empty active view** (around `tasks.tsx:460`): keep the `Create Task…` `Action.Push` — this is onboarding, not scope switching.
- **Preset empty state** (around `tasks.tsx:663`): keep `Show All` (switches preset, not scope). Keep `Clear Tag Filters`.

**Archive view per-task panel** (around `tasks.tsx:1021`):

1. Unarchive *(default; existing)*
2. Open `done.txt` — ⌘O *(new, parity with the active view's "Open todo.txt"; uses `prefs.donePath`)*
3. Open Preferences

`Show Active Tasks` is dropped from this panel.

### Active-filter list icon tint

In `src/tasks.tsx` around line 621, inside the `Active filters` list section:

```diff
- icon={{ source: Icon.Filter, tintColor: Color.Blue }}
+ icon={{ source: Icon.Filter, tintColor: Color.SecondaryText }}
```

No other color changes.

## Out-of-scope cleanups noted but not done here

- Restructuring `Filter by Tag` and `Add Filter` into a single submenu. They overlap in purpose but each has a distinct shortcut and a different default list (current task's tags vs. all known). Worth revisiting separately if it still feels clunky after this cleanup ships.

## Files touched

- `package.json` — add two `commands` entries (`show-completed`, `show-archived`).
- `src/tasks.tsx` — trim panels, drop bump / new-task / quicklink / scope-toggle actions and their handler props, retint the active-filter list icon. Delete the now-unused `quicklinkForPreset` helper (lines 749–757); `PRESET_LABELS` stays (still referenced by `presetLabel`).
- `src/show-completed.tsx` — new entry file.
- `src/show-archived.tsx` — new entry file.
- Possibly extract a shared view shell if the two new entries would otherwise duplicate large blocks of `tasks.tsx`. Prefer a small, focused extraction over re-implementing.

## Testing

- Per the project convention, `src/*.tsx` entry files are not unit-tested. Verification is manual via `npm run dev` and exercising each scenario in Raycast.
- No `src/domain/` or `src/io/` changes are anticipated; the existing test suite should remain green. If implementation discovers a need to touch those layers (e.g. a shared scope-bootstrapping helper), add tests next to that code.

## Risks

- **Lost keyboard reflexes.** Anyone in the habit of ⌘↑/⌘↓ for priority bumps or ⌘⇧C/⌘⇧H for scope switching loses those shortcuts. Mitigation: this is single-user (the author); acceptable. The Set Priority submenu and new root commands cover the functionality.
- **Two `Show *` entries in Raycast root** make the command list slightly longer. Acceptable trade-off for one-step scope launches.
