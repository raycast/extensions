# Priority Squircle Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the colored circle on each Show Tasks row with a 16×16 squircle containing the bold priority letter (A/B/C colored, D–Z muted, none empty, completed green check).

**Architecture:** New `prioritySquircle()` helper in `src/priority.ts` that returns a Raycast `Image.ImageLike` whose `source` is a data URI SVG. `tasks.tsx` swaps its existing `priorityColor`+`priorityIcon` icon construction for a single call to the new helper. Old `priorityIcon()` is removed; `priorityColor()` stays (still used by `menu-bar.tsx`).

**Tech Stack:** TypeScript, Raycast API (`@raycast/api`), Vitest for tests, Biome for lint/format.

**Spec:** `docs/superpowers/specs/2026-05-22-priority-squircle-design.md`

---

## File Structure

- **Create:** `src/priority.test.ts` — unit tests for `prioritySquircle`.
- **Modify:** `src/priority.ts` — add `prioritySquircle()` + an internal `buildSquircleSvg()`; remove `priorityIcon()`. Keep `priorityColor()` and `priorityLabel()`.
- **Modify:** `src/tasks.tsx` — update import on line 38; replace icon construction at lines 465–466 and call site at line 488.

---

### Task 1: Failing tests for A/B/C squircles

**Files:**
- Create: `src/priority.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/priority.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import { prioritySquircle } from "./priority";

function decode(source: unknown): string {
  if (typeof source === "string") return decodeURIComponent(source);
  if (source && typeof source === "object" && "light" in source) {
    return decodeURIComponent((source as { light: string }).light);
  }
  throw new Error("unexpected source shape");
}

function svg(result: ReturnType<typeof prioritySquircle>): string {
  if (typeof result !== "object" || result === null || !("source" in result)) {
    throw new Error("expected { source } shape");
  }
  return decode((result as { source: unknown }).source);
}

describe("prioritySquircle — A/B/C", () => {
  it("A renders red fill with bold A glyph", () => {
    const out = svg(prioritySquircle("A", false));
    expect(out).toContain('fill="#E5484D"');
    expect(out).toContain(">A<");
    expect(out).toContain('font-weight="700"');
  });

  it("B renders orange fill with bold B glyph", () => {
    const out = svg(prioritySquircle("B", false));
    expect(out).toContain('fill="#F76808"');
    expect(out).toContain(">B<");
  });

  it("C renders blue fill with bold C glyph", () => {
    const out = svg(prioritySquircle("C", false));
    expect(out).toContain('fill="#0091FF"');
    expect(out).toContain(">C<");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/priority.test.ts`
Expected: FAIL with `"prioritySquircle" is not exported by "./priority"` (or similar resolution error).

- [ ] **Step 3: Implement minimal `prioritySquircle` for A/B/C**

Open `src/priority.ts` and **replace its full contents** with:

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

const FILL = {
  A: "#E5484D",
  B: "#F76808",
  C: "#0091FF",
} as const;

function buildSquircleSvg(fill: string, glyph: string | null): string {
  const inner =
    glyph === null
      ? ""
      : `<text x="8" y="8" font-family="-apple-system, 'Helvetica Neue', sans-serif" font-size="11" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="central">${glyph}</text>`;
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="4" fill="${fill}"/>${inner}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(body)}`;
}

export function prioritySquircle(key: GroupKey, completed: boolean): Image.ImageLike {
  if (!completed && (key === "A" || key === "B" || key === "C")) {
    return { source: buildSquircleSvg(FILL[key], key) };
  }
  throw new Error(`prioritySquircle: variant not yet implemented (key=${key}, completed=${completed})`);
}
```

Note: the explicit `throw` for unhandled branches is intentional — Tasks 2 and 3 add those branches. It prevents silently passing later tests.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/priority.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/priority.ts src/priority.test.ts
git commit -m "$(cat <<'EOF'
feat(priority): introduce prioritySquircle helper for A/B/C

Returns a data URI SVG with a colored 16x16 squircle and the bold
priority letter. Subsequent commits extend to D-Z, none, and completed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: D–Z and `none` variants (theme-aware grey)

**Files:**
- Modify: `src/priority.test.ts`
- Modify: `src/priority.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/priority.test.ts`:

```ts
describe("prioritySquircle — D-Z and none", () => {
  it("D renders grey fill (light) with bold D glyph", () => {
    const out = svg(prioritySquircle("D", false));
    expect(out).toContain('fill="#8B8D98"');
    expect(out).toContain(">D<");
  });

  it("Z renders grey fill (light) with bold Z glyph", () => {
    const out = svg(prioritySquircle("Z", false));
    expect(out).toContain('fill="#8B8D98"');
    expect(out).toContain(">Z<");
  });

  it("none renders grey fill with no <text> element", () => {
    const out = svg(prioritySquircle("none", false));
    expect(out).toContain('fill="#8B8D98"');
    expect(out).not.toContain("<text");
  });

  it("grey variants ship distinct light/dark sources", () => {
    const result = prioritySquircle("D", false);
    if (typeof result !== "object" || result === null || !("source" in result)) {
      throw new Error("expected { source } shape");
    }
    const source = (result as { source: unknown }).source;
    expect(typeof source === "object" && source !== null && "light" in source && "dark" in source).toBe(true);
    const dark = decodeURIComponent((source as { dark: string }).dark);
    expect(dark).toContain('fill="#6F6F77"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/priority.test.ts`
Expected: 4 new tests FAIL — the helper throws `prioritySquircle: variant not yet implemented` for `D`, `Z`, and `none`.

- [ ] **Step 3: Extend the helper**

In `src/priority.ts`, replace the `FILL` constant and the `prioritySquircle` function with:

```ts
const FILL = {
  A: "#E5484D",
  B: "#F76808",
  C: "#0091FF",
  greyLight: "#8B8D98",
  greyDark: "#6F6F77",
} as const;

// (buildSquircleSvg unchanged)

export function prioritySquircle(key: GroupKey, completed: boolean): Image.ImageLike {
  if (completed) {
    throw new Error("prioritySquircle: completed variant not yet implemented");
  }
  if (key === "A" || key === "B" || key === "C") {
    return { source: buildSquircleSvg(FILL[key], key) };
  }
  const glyph = key === "none" ? null : key;
  return {
    source: {
      light: buildSquircleSvg(FILL.greyLight, glyph),
      dark: buildSquircleSvg(FILL.greyDark, glyph),
    },
  };
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npm test -- src/priority.test.ts`
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/priority.ts src/priority.test.ts
git commit -m "$(cat <<'EOF'
feat(priority): add D-Z and none variants for prioritySquircle

Grey-filled squircle with the priority letter (or empty for none),
with separate light/dark hex values for theme awareness.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Completed (green check) variant

**Files:**
- Modify: `src/priority.test.ts`
- Modify: `src/priority.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/priority.test.ts`:

```ts
describe("prioritySquircle — completed", () => {
  it("completed renders green fill with a checkmark <path>", () => {
    const out = svg(prioritySquircle("A", true));
    expect(out).toContain('fill="#30A46C"');
    expect(out).toContain("<path");
    expect(out).not.toContain(">A<");
  });

  it("completed + none still renders green check", () => {
    const out = svg(prioritySquircle("none", true));
    expect(out).toContain('fill="#30A46C"');
    expect(out).toContain("<path");
  });

  it("completed wins over any priority letter", () => {
    const out = svg(prioritySquircle("D", true));
    expect(out).toContain('fill="#30A46C"');
    expect(out).not.toContain(">D<");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/priority.test.ts`
Expected: 3 new tests FAIL with `"completed variant not yet implemented"`.

- [ ] **Step 3: Extend the helper for completed**

In `src/priority.ts`:

1. Add `green: "#30A46C"` to the `FILL` constant:

```ts
const FILL = {
  A: "#E5484D",
  B: "#F76808",
  C: "#0091FF",
  greyLight: "#8B8D98",
  greyDark: "#6F6F77",
  green: "#30A46C",
} as const;
```

2. Extend `buildSquircleSvg` so a sentinel glyph value `"check"` renders a path instead of text. Replace the function with:

```ts
function buildSquircleSvg(fill: string, glyph: string | null): string {
  let inner = "";
  if (glyph === "check") {
    inner =
      '<path d="M4.5 8.2L7 10.7L11.5 5.8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
  } else if (glyph !== null) {
    inner = `<text x="8" y="8" font-family="-apple-system, 'Helvetica Neue', sans-serif" font-size="11" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="central">${glyph}</text>`;
  }
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="4" fill="${fill}"/>${inner}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(body)}`;
}
```

3. Replace the body of `prioritySquircle` so completed short-circuits first:

```ts
export function prioritySquircle(key: GroupKey, completed: boolean): Image.ImageLike {
  if (completed) {
    return { source: buildSquircleSvg(FILL.green, "check") };
  }
  if (key === "A" || key === "B" || key === "C") {
    return { source: buildSquircleSvg(FILL[key], key) };
  }
  const glyph = key === "none" ? null : key;
  return {
    source: {
      light: buildSquircleSvg(FILL.greyLight, glyph),
      dark: buildSquircleSvg(FILL.greyDark, glyph),
    },
  };
}
```

- [ ] **Step 4: Run all tests to verify they pass**

Run: `npm test -- src/priority.test.ts`
Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/priority.ts src/priority.test.ts
git commit -m "$(cat <<'EOF'
feat(priority): add completed (green check) variant to prioritySquircle

Completed tasks short-circuit before priority colors, rendering a
green squircle with a white check path regardless of priority letter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire up the call site in `tasks.tsx` and remove `priorityIcon`

**Files:**
- Modify: `src/tasks.tsx:38`, `src/tasks.tsx:465-466`, `src/tasks.tsx:488`
- Modify: `src/priority.ts`

- [ ] **Step 1: Update the import in `tasks.tsx`**

In `src/tasks.tsx`, change line 38 from:

```ts
import { priorityColor, priorityIcon, priorityLabel } from "./priority";
```

to:

```ts
import { priorityLabel, prioritySquircle } from "./priority";
```

(`priorityColor` is not used in `tasks.tsx` — it was only consumed via the now-removed local `color` variable. `menu-bar.tsx` keeps importing it separately.)

- [ ] **Step 2: Replace the icon construction in `TaskItem`**

In `src/tasks.tsx`, around lines 465–466, delete these two lines:

```ts
const color = task.completed ? Color.SecondaryText : priorityColor(groupKey);
const iconShape = task.completed ? Icon.CheckCircle : priorityIcon(groupKey);
```

Then change the `icon` prop on `List.Item` (currently at line 488):

```ts
// before
icon={{ source: iconShape, tintColor: color }}
// after
icon={prioritySquircle(groupKey, task.completed)}
```

- [ ] **Step 3: Verify `Color` is still used elsewhere in `tasks.tsx`**

Run: `grep -n "Color\\." src/tasks.tsx`
Expected: still has at least one match (e.g. `Color.Blue` used by the filter icon around line 302 and `dueChipColor`). If no matches remain, also remove `Color` from the `@raycast/api` import on line 1 — otherwise leave it.

- [ ] **Step 4: Remove `priorityIcon` from `src/priority.ts`**

`priorityIcon` no longer has any callers. Delete the `priorityIcon` export entirely from `src/priority.ts` (it should look like the function defined at lines 11–14 of the original file — gone now).

Also remove the `Icon` import if it's no longer used. Open `src/priority.ts`, check the first import line; after removal, the file should import only `Color` and `Image` from `@raycast/api`:

```ts
import { Color, type Image } from "@raycast/api";
```

- [ ] **Step 5: Typecheck, lint, and run all tests**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Run: `npm test`
Expected: all tests pass (existing + the 10 new ones from Tasks 1–3).

- [ ] **Step 6: Commit**

```bash
git add src/tasks.tsx src/priority.ts
git commit -m "$(cat <<'EOF'
feat(tasks): render priority as bold-letter squircles in row icons

Swaps the colored Icon.CircleFilled / Icon.CheckCircle pair for the
new prioritySquircle helper, giving each row an at-a-glance priority
letter. Removes the now-unused priorityIcon export.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Manual verification in Raycast dev mode

**Files:** none modified — manual smoke test.

- [ ] **Step 1: Start Raycast dev mode**

Run (in the project root, leave it running): `npm run dev`

Wait for Raycast to load the extension (it pops to focus automatically). If the `~/todo.txt` file from your fixtures is empty, paste a few sample tasks containing each priority:

```
(A) Ship squircles +txtodo
(B) Review PR +work
(C) Email reply
(D) Tidy desk
(Z) Plan vacation
Buy groceries
x 2026-05-21 (A) Old completed item
```

- [ ] **Step 2: Visual check — A/B/C rows**

In **Show Tasks**, confirm:
- The `(A)` row's left icon is a red squircle with a bold white **A**.
- The `(B)` row is orange with bold **B**.
- The `(C)` row is blue with bold **C**.

- [ ] **Step 3: Visual check — D–Z and no-priority rows**

Confirm:
- The `(D)` and `(Z)` rows show a grey squircle with their letter.
- The no-priority row (`Buy groceries`) shows a plain grey squircle, no letter.

- [ ] **Step 4: Visual check — completed**

Confirm:
- The `x 2026-05-21 (A) Old completed item` row shows a **green** squircle with a white check — not red, no `A`.
- Toggle a non-completed task to completed (default action). Its squircle should switch to green-check immediately.

- [ ] **Step 5: Theme check**

Switch macOS appearance between Light and Dark (System Settings → Appearance). Confirm the grey squircles (D–Z and none) still read clearly in both themes. Saturated A/B/C/green tones should look identical.

- [ ] **Step 6: Letter rendering quality check**

Look closely at the bold letter shapes at the default Raycast list density.
- If letters look clean and centered → done.
- If letters look soft, off-center, or the font weight isn't rendering → flag in a follow-up; the spec already calls out a `<path>`-glyph fallback. Do **not** ship the fallback unless this check actually fails.

- [ ] **Step 7: Stop dev mode**

Hit `Ctrl+C` in the `npm run dev` terminal. No code commit for this task — it's verification only.

---

## Self-Review Summary

**Spec coverage:** Variants table → Tasks 1–3. Architecture (helper + call site) → Tasks 1 and 4. Tests requirement → Tasks 1–3. Removals (`priorityIcon`) and kept items (`priorityColor`) → Task 4. Risk fallback (path glyphs) → flagged in Task 5 step 6, not implemented preemptively.

**Type consistency:** `prioritySquircle(key: GroupKey, completed: boolean): Image.ImageLike` — same signature in Tasks 1, 2, 3. `FILL` constant grows by adding keys, never renaming. `buildSquircleSvg(fill, glyph)` keeps `glyph: string | null` throughout; Task 3 introduces the `"check"` sentinel without changing the signature.

**No placeholders:** every step has runnable commands, full code, and concrete expected output.
