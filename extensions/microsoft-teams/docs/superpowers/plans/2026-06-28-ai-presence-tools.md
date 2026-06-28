# AI Presence Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two Raycast AI Extension tools so the user can get and set their own Microsoft Teams presence via Raycast AI.

**Architecture:** Two thin tools under `src/tools/` wrap the existing presence API in `src/api/presence.ts`. A small refactor in `presence.ts` extracts the set logic (without HUD) and the result message into reusable exports so both the `setPresence` view command and the new AI tools share identical logic and texts.

**Tech Stack:** TypeScript, React 19, `@raycast/api`, `@raycast/utils`, Microsoft Graph REST API.

## Global Constraints

- Platform: macOS only (existing `platforms: ["macOS"]`).
- No new runtime or dev dependencies.
- `@raycast/api` ^1.104.20 (already present).
- The repo has **no test framework**. Follow the existing pattern: verify via
  `npm run lint` (lint) and `npm run build` (TypeScript type-check + build),
  plus manual verification in `npm run dev` (Raycast AI chat). Do NOT add a
  test runner.
- Lint must pass clean (`npm run lint`) before each commit.
- Tool `name` values in `package.json` must exactly match the file basenames in
  `src/tools/` (Raycast convention).

---

## File Structure

- **Modify** `src/api/presence.ts` — export `readableAvailability`, add
  `applyAvailability` (set without HUD) and `presenceResultMessage`; refactor
  `setAvailability` to use them.
- **Create** `src/tools/get-presence.ts` — AI tool returning current presence.
- **Create** `src/tools/set-presence.ts` — AI tool setting/resetting presence.
- **Modify** `package.json` — add the `tools` array with both tool definitions.

---

### Task 1: Refactor `presence.ts` for reuse

**Files:**
- Modify: `src/api/presence.ts`

**Interfaces:**
- Consumes: existing `setPreferredPresence`, `clearPreferredPresence`,
  `readableAvailability`, `Availability` in `src/api/presence.ts`.
- Produces (new/changed exports later tasks rely on):
  - `export function readableAvailability(availability: string): string`
  - `export async function applyAvailability(availability?: Availability): Promise<void>`
  - `export function presenceResultMessage(availability?: Availability): string`
  - `setAvailability` keeps its existing signature/behavior (sets + shows HUD).

- [ ] **Step 1: Export and widen `readableAvailability`**

In `src/api/presence.ts`, change the existing function from:

```ts
function readableAvailability(availability: Availability) {
  return availability
    .replaceAll(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();
}
```

to:

```ts
export function readableAvailability(availability: string) {
  return availability
    .replaceAll(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();
}
```

- [ ] **Step 2: Add `applyAvailability` and `presenceResultMessage`, refactor `setAvailability`**

Replace the existing `setAvailability` function:

```ts
export async function setAvailability(availability?: Availability) {
  if (availability) {
    await setPreferredPresence(availability);
  } else {
    await clearPreferredPresence();
  }
  switch (availability) {
    case undefined:
      return await showHUD("Reset availability to default");
    case "Busy":
    case "DoNotDisturb":
      return await showHUD(`Set status to "${readableAvailability(availability)}" (expires in 1 day)`);
    default:
      return await showHUD(`Set status to "${readableAvailability(availability)}" (expires in 7 days)`);
  }
}
```

with:

```ts
export async function applyAvailability(availability?: Availability) {
  if (availability) {
    await setPreferredPresence(availability);
  } else {
    await clearPreferredPresence();
  }
}

export function presenceResultMessage(availability?: Availability): string {
  switch (availability) {
    case undefined:
      return "Reset availability to default";
    case "Busy":
    case "DoNotDisturb":
      return `Set status to "${readableAvailability(availability)}" (expires in 1 day)`;
    default:
      return `Set status to "${readableAvailability(availability)}" (expires in 7 days)`;
  }
}

export async function setAvailability(availability?: Availability) {
  await applyAvailability(availability);
  return await showHUD(presenceResultMessage(availability));
}
```

- [ ] **Step 3: Verify type-check and lint**

Run: `npm run lint`
Expected: PASS (no errors). The `showHUD` import is still used by
`setAvailability`, so no unused-import warnings.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds (TypeScript compiles with no errors).

- [ ] **Step 5: Manual smoke test of unchanged view behavior**

Run: `npm run dev`. Open the **Set Presence** command, set e.g. "Busy", and
confirm the HUD shows `Set status to "busy" (expires in 1 day)` exactly as
before. Then stop dev (Ctrl-C).

- [ ] **Step 6: Commit**

```bash
git add src/api/presence.ts
git commit -m "refactor: extract applyAvailability and presenceResultMessage from setAvailability

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Add `get-presence` AI tool

**Files:**
- Create: `src/tools/get-presence.ts`
- Modify: `package.json` (add `tools` array)

**Interfaces:**
- Consumes: `getPresence` and `readableAvailability` from `../api/presence`.
- Produces: default-exported async tool returning
  `{ availability: string; activity: string; readable: string }`.

- [ ] **Step 1: Create the tool file**

Create `src/tools/get-presence.ts`:

```ts
import { getPresence, readableAvailability } from "../api/presence";

/**
 * Gets the current Microsoft Teams presence (availability) of the signed-in
 * user.
 */
export default async function () {
  const presence = await getPresence();
  return {
    availability: presence.availability,
    activity: presence.activity,
    readable: readableAvailability(presence.availability),
  };
}
```

- [ ] **Step 2: Add the `tools` array to `package.json`**

In `package.json`, add a top-level `tools` array immediately after the
`commands` array (keep valid JSON — add a comma after the `commands` array's
closing bracket):

```json
  "tools": [
    {
      "name": "get-presence",
      "title": "Get Presence",
      "description": "Get your current Microsoft Teams presence (availability)."
    }
  ],
```

- [ ] **Step 3: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: PASS. The build regenerates `raycast-env.d.ts` and recognizes the new
tool without errors.

- [ ] **Step 4: Manual test via Raycast AI**

Run: `npm run dev`. In Raycast, open **AI** (Quick AI / AI Chat) and ask:
"What is my Microsoft Teams presence?" Confirm the AI calls the `get-presence`
tool and reports your current availability. Stop dev (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
git add src/tools/get-presence.ts package.json raycast-env.d.ts
git commit -m "feat: add get-presence AI tool

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Add `set-presence` AI tool

**Files:**
- Create: `src/tools/set-presence.ts`
- Modify: `package.json` (extend `tools` array)

**Interfaces:**
- Consumes: `Availability`, `applyAvailability`, `presenceResultMessage` from
  `../api/presence`.
- Produces: default-exported async tool taking `Input` and returning the result
  message string.

- [ ] **Step 1: Create the tool file**

Create `src/tools/set-presence.ts`:

```ts
import { applyAvailability, Availability, presenceResultMessage } from "../api/presence";

type Input = {
  /**
   * The presence to set for the signed-in user. Use "Reset" to return to the
   * automatically calculated presence.
   */
  availability: "Available" | "Busy" | "DoNotDisturb" | "BeRightBack" | "Away" | "Offline" | "Reset";
};

/**
 * Sets the Microsoft Teams presence of the signed-in user, or resets it to the
 * automatically calculated presence when "Reset" is given.
 */
export default async function (input: Input) {
  const availability: Availability | undefined =
    input.availability === "Reset" ? undefined : input.availability;
  // Set without a HUD; the AI reports the result itself.
  await applyAvailability(availability);
  return presenceResultMessage(availability);
}
```

- [ ] **Step 2: Add the `set-presence` entry to the `tools` array**

In `package.json`, extend the `tools` array (added in Task 2) with a second
entry:

```json
    {
      "name": "set-presence",
      "title": "Set Presence",
      "description": "Set your Microsoft Teams presence, or reset it to automatic. Use availability \"Reset\" to clear a manually set presence."
    }
```

The resulting `tools` array:

```json
  "tools": [
    {
      "name": "get-presence",
      "title": "Get Presence",
      "description": "Get your current Microsoft Teams presence (availability)."
    },
    {
      "name": "set-presence",
      "title": "Set Presence",
      "description": "Set your Microsoft Teams presence, or reset it to automatic. Use availability \"Reset\" to clear a manually set presence."
    }
  ],
```

- [ ] **Step 3: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: PASS. No unused-import or type errors.

- [ ] **Step 4: Manual test via Raycast AI**

Run: `npm run dev`. In Raycast AI, ask: "Set my Teams presence to Do not
disturb." Confirm the AI calls `set-presence` and reports
`Set status to "do not disturb" (expires in 1 day)`, and that Teams reflects the
change. Then ask: "Reset my Teams presence" and confirm it returns
`Reset availability to default`. Stop dev (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
git add src/tools/set-presence.ts package.json raycast-env.d.ts
git commit -m "feat: add set-presence AI tool

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage:**
  - Get own presence → Task 2 (`get-presence`). ✓
  - Set own presence → Task 3 (`set-presence`). ✓
  - `Reset` value within set tool → Task 3 `Input.availability` includes
    `"Reset"`. ✓
  - Refactor: result message as reusable function → Task 1
    (`presenceResultMessage`); plus `applyAvailability` to set without HUD so
    the tool returns a string instead of showing a HUD (as the spec requires).
    ✓
  - No confirmation dialogs → no `confirmation` export in either tool. ✓
  - Out of scope (other users, status message) → not implemented. ✓
- **Placeholder scan:** No TBD/TODO/placeholder steps; all code shown in full.
- **Type consistency:** `applyAvailability`, `presenceResultMessage`,
  `readableAvailability`, and `Availability` are defined in Task 1 and consumed
  with matching names/signatures in Tasks 2–3. `getPresence` returns
  `{ availability: string; activity: string }` (existing `Presence` interface),
  consumed correctly in Task 2.
