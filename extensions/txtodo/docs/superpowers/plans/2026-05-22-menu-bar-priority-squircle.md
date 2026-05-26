# Menu-Bar Priority Squircle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the existing `prioritySquircle` helper for per-task items in the menu-bar dropdown, then retire the now-orphaned `priorityColor` export.

**Architecture:** Two-line call-site swap in `src/menu-bar.tsx`, then dead-code removal of `priorityColor` (zero remaining consumers) and the now-unused `Color` import in `src/priority.ts`. No new tests — the existing 10 `prioritySquircle` unit tests already cover every variant the menu bar will pass.

**Tech Stack:** TypeScript, Raycast API (`@raycast/api`), Vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-05-22-menu-bar-priority-squircle-design.md`

---

## File Structure

- **Modify:** `src/menu-bar.tsx` — import on line 8 (swap `priorityColor` → `prioritySquircle`), icon prop on line 88 (swap inline `{ source, tintColor }` for `prioritySquircle(key, false)`).
- **Modify:** `src/priority.ts` — delete the `priorityColor` export and the `Color` import (no longer used after the menu-bar swap).

---

### Task 1: Swap the menu-bar icon to `prioritySquircle` and retire `priorityColor`

**Files:**
- Modify: `src/menu-bar.tsx:8`, `src/menu-bar.tsx:88`
- Modify: `src/priority.ts`

- [ ] **Step 1: Update the import in `menu-bar.tsx`**

In `src/menu-bar.tsx`, change line 8 from:

```ts
import { priorityColor } from "./priority";
```

to:

```ts
import { prioritySquircle } from "./priority";
```

- [ ] **Step 2: Swap the icon prop on the task `MenuBarExtra.Item`**

In `src/menu-bar.tsx`, around line 88, change:

```ts
icon={{ source: Icon.Circle, tintColor: priorityColor(key) }}
```

to:

```ts
icon={prioritySquircle(key, false)}
```

The surrounding `MenuBarExtra.Item` props (`key`, `title`, `subtitle`, `tooltip`, `onAction`) stay exactly as they are. `completed` is hard-coded `false` because the snapshot is already filtered to active tasks at line 76 (`state.snapshot.tasks.filter((t) => !t.completed)`).

- [ ] **Step 3: Confirm `priorityColor` truly has no other consumers**

Run: `grep -rn "priorityColor" src/`
Expected output: only the export line in `src/priority.ts:4`. No imports anywhere.

If `grep` shows anything other than that single export-definition line, **stop and report** — there's an unexpected consumer.

- [ ] **Step 4: Remove `priorityColor` and the now-unused `Color` import from `src/priority.ts`**

The current state of `src/priority.ts` (top of file) is:

```ts
import { Color, type Image } from "@raycast/api";
import type { GroupKey } from "./domain/sort";

export function priorityColor(key: GroupKey): Color {
  if (key === "A") return Color.Red;
  if (key === "B") return Color.Orange;
  if (key === "C") return Color.Blue;
  return Color.SecondaryText;
}

export function priorityLabel(key: GroupKey): string {
  return key === "none" ? "No priority" : `Priority ${key}`;
}
```

Replace those lines (the entire `priorityColor` function and the `Color` part of the import) so the top of `src/priority.ts` becomes:

```ts
import type { Image } from "@raycast/api";
import type { GroupKey } from "./domain/sort";

export function priorityLabel(key: GroupKey): string {
  return key === "none" ? "No priority" : `Priority ${key}`;
}
```

The rest of the file (`FILL`, `buildSquircleSvg`, `prioritySquircle`) stays exactly as it was.

- [ ] **Step 5: Typecheck, lint, and test**

Run: `npx tsc --noEmit`
Expected: exit code 0, no errors.

Run: `npm run lint`
Expected: exit code 0, no errors.

Run: `npm test`
Expected: 127 tests pass (no new tests added — the existing 10 `prioritySquircle` tests already cover every variant menu-bar uses).

If any check fails, stop and investigate before committing. Do not skip the failure — the most likely cause is a stray `priorityColor` reference somewhere `grep` missed, or `Color` being used elsewhere in `priority.ts` that the spec assumed was gone.

- [ ] **Step 6: Commit**

```bash
git add src/menu-bar.tsx src/priority.ts
git commit -m "$(cat <<'EOF'
feat(menu-bar): render priority as squircles in dropdown task items

Reuses the prioritySquircle helper so the menu-bar dropdown matches
the visual treatment in Show Tasks. priorityColor is removed since
this was its only remaining consumer.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Manual verification in Raycast dev mode

**Files:** none modified — visual smoke test only.

- [ ] **Step 1: Start Raycast dev mode**

Run (in the project root, leave running): `npm run dev`

Wait for Raycast to load the extension. Make sure the menu-bar item is visible (run **Toggle Menu Bar** if it isn't).

- [ ] **Step 2: Visual check — dropdown task items**

Open the TXTodo menu-bar dropdown. For each task in the top section:
- A-priority task → red squircle, bold white **A**
- B-priority → orange + **B**
- C-priority → blue + **C**
- D-Z priority → grey + their letter
- No-priority → empty grey squircle

If you don't have tasks covering every variant, paste a few into `~/todo.txt`:

```
(A) Ship menu-bar squircles
(B) Review PR
(C) Email reply
(D) Tidy desk
(Z) Plan vacation
Buy groceries
```

Then reload via the **Reload** menu item or wait for the 10-minute auto-refresh.

- [ ] **Step 3: Theme check**

Switch macOS appearance between Light and Dark (System Settings → Appearance). Confirm:
- Saturated A/B/C squircles look identical in both themes.
- Grey squircles (D-Z, none) read clearly in both themes.

- [ ] **Step 4: Verify unchanged elements**

Confirm the items that should NOT have changed still look right:
- Top-level macOS menu-bar icon (the CheckCircle) is unchanged.
- "Add Task" still has the `+` icon, "Show Tasks" still has the list icon, "Reload" still has the refresh icon.

- [ ] **Step 5: Stop dev mode**

Hit `Ctrl+C` in the `npm run dev` terminal. No commit for this task — it's verification only.

---

## Self-Review Summary

**Spec coverage:** Per-task icon swap → Task 1 Step 2. Import update → Task 1 Step 1. `priorityColor` removal → Task 1 Steps 3-4. `Color` import removal → Task 1 Step 4. Verification → Task 2. Tests/typecheck/lint → Task 1 Step 5.

**Type consistency:** `prioritySquircle(key, false)` matches the signature used in `tasks.tsx`. `key: GroupKey` is the same type the menu bar already computes at line 84.

**No placeholders:** every step has runnable commands, full code, and concrete expected output.
