# AI Status Tools (+ Presence Consistency) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Raycast AI tools to get/set/clear the user's Teams status message, and align the presence tools to the same get/set/clear pattern.

**Architecture:** Status tools wrap a new `getStatus()` plus the existing `setStatus`/`clearStatus` in `src/api/status.ts`. `status.ts` reads the status message from `GET /me/presence` (where it lives on the presence resource) and is cleaned up to omit the expiry instead of writing a year-9999 sentinel. Presence gains a `clear-presence` tool and the `set-presence` enum drops the `"Reset"` value.

**Tech Stack:** TypeScript, React 19, `@raycast/api`, `@raycast/utils`, `luxon`, Microsoft Graph REST API.

## Global Constraints

- Platform: macOS only. No new runtime or dev dependencies.
- The repo has **no test framework**. Verify via `npm run lint` (lint) and
  `npm run build` (TypeScript type-check + build). Do NOT add a test runner.
  Do NOT run `npm run dev` (interactive; cannot run headless) — interactive
  Raycast testing is deferred to the controller/user.
- Do NOT commit `raycast-env.d.ts` — it is auto-generated and git-ignored.
- Tool `name` values in `package.json` must exactly match the file basenames
  in `src/tools/`.
- Status field vocabulary is shared across get and set: the expiry field is
  named `expiry` in both `get-status` output and `set-status` input.
- `set-status` always pins the status (always appends the pinned marker).
- No confirmation dialogs in any tool.
- Lint must pass clean before each commit.

---

## File Structure

- **Modify** `src/tools/set-presence.ts` — drop `"Reset"` from the enum and the reset mapping.
- **Create** `src/tools/clear-presence.ts` — clears preferred presence.
- **Modify** `src/api/status.ts` — `PINNED_NOTE` constant; omit expiry sentinel (write UTC); add `getStatus()` + `Status` interface.
- **Create** `src/tools/get-status.ts`, `src/tools/set-status.ts`, `src/tools/clear-status.ts`.
- **Modify** `package.json` — update `set-presence` description; add `clear-presence`, `get-status`, `set-status`, `clear-status` to the `tools` array.

---

### Task 1: Presence get/set/clear consistency

**Files:**
- Modify: `src/tools/set-presence.ts`
- Create: `src/tools/clear-presence.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes (already exported from `src/api/presence.ts`): `applyAvailability(availability?: Availability): Promise<void>`, `presenceResultMessage(availability?: Availability): string`. `Availability` includes `"Available" | "Busy" | "DoNotDisturb" | "BeRightBack" | "Away" | "Offline" | "PresenceUnknown"`.
- Produces: a `clear-presence` tool; a `set-presence` tool whose `Input.availability` is the six real availabilities (no `"Reset"`).

- [ ] **Step 1: Rewrite `set-presence.ts` without the `"Reset"` value**

Replace the entire contents of `src/tools/set-presence.ts` with:

```ts
import { applyAvailability, presenceResultMessage } from "../api/presence";

type Input = {
  /** The presence to set for the signed-in user. */
  availability: "Available" | "Busy" | "DoNotDisturb" | "BeRightBack" | "Away" | "Offline";
};

/**
 * Sets the Microsoft Teams presence of the signed-in user.
 */
export default async function (input: Input) {
  // Set without a HUD; the AI reports the result itself.
  await applyAvailability(input.availability);
  return presenceResultMessage(input.availability);
}
```

(The `Availability` import is removed — the six-value union is assignable to `Availability`, so `applyAvailability` and `presenceResultMessage` accept it directly.)

- [ ] **Step 2: Create `clear-presence.ts`**

Create `src/tools/clear-presence.ts`:

```ts
import { applyAvailability, presenceResultMessage } from "../api/presence";

/**
 * Clears the user's manually set Microsoft Teams presence, returning to the
 * automatically calculated presence.
 */
export default async function () {
  // Clear without a HUD; the AI reports the result itself.
  await applyAvailability(undefined);
  return presenceResultMessage(undefined);
}
```

- [ ] **Step 3: Update `package.json` `tools` (set-presence description + add clear-presence)**

In `package.json`, change the `set-presence` entry's `description` to drop the "Reset" mention, and add a `clear-presence` entry immediately after it. The `set-presence` and `clear-presence` entries should read exactly:

```json
    {
      "name": "set-presence",
      "title": "Set Presence",
      "description": "Set your Microsoft Teams presence."
    },
    {
      "name": "clear-presence",
      "title": "Clear Presence",
      "description": "Clear your manually set Microsoft Teams presence, returning to the automatically calculated presence."
    }
```

- [ ] **Step 4: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: both PASS. Build entry points include `src/tools/clear-presence.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/tools/set-presence.ts src/tools/clear-presence.ts package.json
git commit -m "feat: add clear-presence tool and drop Reset from set-presence

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Status API — read support and expiry cleanup

**Files:**
- Modify: `src/api/status.ts`

**Interfaces:**
- Consumes (already exported from `src/api/api.ts`): `get(options)`, `post(options)`, `failIfNotOk(response, name?)`, `bodyOf<T>(response)`.
- Produces (new/changed exports later tasks rely on):
  - `interface Status { message: string | null; expiry: string | null; published: string | null }`
  - `export async function getStatus(): Promise<Status>`
  - `export async function setStatus(message: string, pinned?: boolean, expiry?: Date | null): Promise<void>` (signature unchanged; expiry now omitted instead of sentinel)
  - `export async function clearStatus(): Promise<void>` (unchanged)

- [ ] **Step 1: Rewrite `src/api/status.ts`**

Replace the entire contents of `src/api/status.ts` with:

```ts
import { bodyOf, failIfNotOk, get, post } from "./api";
import { DateTime } from "luxon";

const PINNED_NOTE = "<pinnednote></pinnednote>";

// https://learn.microsoft.com/en-us/graph/api/resources/datetimetimezone
interface NativeStatus {
  message?: {
    contentType: "text";
    content: string | null;
  };
  expiryDateTime?: {
    dateTime: string | null; // "2019-04-16T09:00:00"
    timeZone?: string;
  };
}

// Shape of the statusMessage carried on the presence resource (GET /me/presence).
interface NativePresence {
  statusMessage?: {
    message?: { content?: string | null };
    expiryDateTime?: { dateTime?: string | null; timeZone?: string };
    publishedDateTime?: string | null;
  };
}

export interface Status {
  message: string | null; // text, pinned marker stripped; null if no status
  expiry: string | null; // absolute ISO timestamp; null = no expiry
  published: string | null; // absolute ISO timestamp, when set (read-only)
}

async function postStatus(status: NativeStatus) {
  const response = await post({
    apiVersion: "beta",
    path: "/me/presence/setStatusMessage",
    body: {
      statusMessage: status,
    },
  });
  await failIfNotOk(response, "Setting status");
}

export async function setStatus(message: string, pinned = false, expiry?: Date | null) {
  await postStatus({
    message: {
      contentType: "text",
      content: message + (pinned ? PINNED_NOTE : ""),
    },
    // Omit expiryDateTime entirely when there is no expiry: per Microsoft Graph,
    // a status without expiryDateTime never expires.
    expiryDateTime: expiry
      ? {
          dateTime: DateTime.fromJSDate(expiry).toUTC().toISO({ includeOffset: false }),
          timeZone: "UTC",
        }
      : undefined,
  });
}

export async function clearStatus() {
  await postStatus({
    message: {
      contentType: "text",
      content: null,
    },
  });
}

function toIsoTimestamp(dateTime: string, timeZone?: string): string | null {
  // Interpret with the provided zone if luxon understands it (e.g. "UTC" or an
  // IANA name); otherwise fall back to UTC. Statuses set through this extension
  // are always written in UTC, so this is exact for them; only a status set
  // externally (Teams app) with an unrecognized Windows zone name could be off
  // by its offset — acceptable for an AI-only tool.
  let parsed = DateTime.fromISO(dateTime, { zone: timeZone ?? "utc" });
  if (!parsed.isValid) {
    parsed = DateTime.fromISO(dateTime, { zone: "utc" });
  }
  // Treat invalid dates and the legacy year-9999 "never" sentinel as no expiry.
  if (!parsed.isValid || parsed.year >= 9999) {
    return null;
  }
  return parsed.toISO();
}

export async function getStatus(): Promise<Status> {
  const response = await get({ path: "/me/presence" });
  await failIfNotOk(response, "Getting status");
  const presence = await bodyOf<NativePresence>(response);
  const statusMessage = presence.statusMessage;

  const rawContent = statusMessage?.message?.content ?? null;
  // Defensively strip the pinned marker so the text is clean.
  const message = rawContent ? rawContent.replaceAll(PINNED_NOTE, "") || null : null;

  const expiryDateTime = statusMessage?.expiryDateTime;
  const expiry = expiryDateTime?.dateTime
    ? toIsoTimestamp(expiryDateTime.dateTime, expiryDateTime.timeZone)
    : null;

  const published = statusMessage?.publishedDateTime ?? null;

  return { message, expiry, published };
}
```

- [ ] **Step 2: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: both PASS. No type errors (note `DateTime.toISO()` returns `string | null`, which matches the `string | null` return/field types — no cast needed).

- [ ] **Step 3: Commit**

```bash
git add src/api/status.ts
git commit -m "feat: add getStatus and omit expiry sentinel in status API

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Status tools (get / set / clear)

**Files:**
- Create: `src/tools/get-status.ts`
- Create: `src/tools/set-status.ts`
- Create: `src/tools/clear-status.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes (from `src/api/status.ts`, Task 2): `getStatus(): Promise<Status>`, `setStatus(message: string, pinned?: boolean, expiry?: Date | null): Promise<void>`, `clearStatus(): Promise<void>`.
- Produces: three AI tools registered in `package.json`.

- [ ] **Step 1: Create `get-status.ts`**

Create `src/tools/get-status.ts`:

```ts
import { getStatus } from "../api/status";

/**
 * Gets the signed-in user's current Microsoft Teams status message, including
 * its optional expiry and when it was published.
 */
export default async function () {
  return await getStatus();
}
```

- [ ] **Step 2: Create `set-status.ts`**

Create `src/tools/set-status.ts`:

```ts
import { setStatus } from "../api/status";

type Input = {
  /** The status message text. */
  message: string;
  /**
   * Optional absolute expiry as an ISO 8601 timestamp, preferably in UTC
   * (e.g. "2026-06-28T17:00:00Z"). Omit for a status that never expires.
   */
  expiry?: string;
};

/**
 * Sets the signed-in user's Microsoft Teams status message. The status is
 * always pinned (shown when people message the user).
 */
export default async function (input: Input) {
  let expiry: Date | null = null;
  if (input.expiry) {
    expiry = new Date(input.expiry);
    if (isNaN(expiry.getTime())) {
      throw new Error(`Invalid expiry timestamp: "${input.expiry}". Provide an ISO 8601 date-time.`);
    }
  }
  await setStatus(input.message, true, expiry);
  return expiry
    ? `Set status message to "${input.message}" (expires ${expiry.toISOString()})`
    : `Set status message to "${input.message}" (no expiry)`;
}
```

- [ ] **Step 3: Create `clear-status.ts`**

Create `src/tools/clear-status.ts`:

```ts
import { clearStatus } from "../api/status";

/**
 * Clears the signed-in user's Microsoft Teams status message.
 */
export default async function () {
  await clearStatus();
  return "Cleared status";
}
```

- [ ] **Step 4: Add the three tools to `package.json`**

In `package.json`, append these three entries to the end of the `tools` array (after the last existing entry; ensure a comma separates them from the prior entry and the array stays valid):

```json
    {
      "name": "get-status",
      "title": "Get Status",
      "description": "Get your current Microsoft Teams status message, including its expiry."
    },
    {
      "name": "set-status",
      "title": "Set Status",
      "description": "Set your Microsoft Teams status message with an optional expiry. The status is always pinned."
    },
    {
      "name": "clear-status",
      "title": "Clear Status",
      "description": "Clear your Microsoft Teams status message."
    }
```

- [ ] **Step 5: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: both PASS. Build entry points include `src/tools/get-status.ts`, `src/tools/set-status.ts`, `src/tools/clear-status.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/get-status.ts src/tools/set-status.ts src/tools/clear-status.ts package.json
git commit -m "feat: add get-status, set-status, and clear-status AI tools

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: set-status — pinned input (default true) + confirmation

**Files:**
- Modify: `src/tools/set-status.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `setStatus(message: string, pinned?: boolean, expiry?: Date | null): Promise<void>` from `src/api/status.ts`; `Tool` from `@raycast/api`.
- Produces: `set-status` tool with an optional `pinned` input (default true) and an exported `confirmation`.

- [ ] **Step 1: Replace `src/tools/set-status.ts`**

Replace the entire contents of `src/tools/set-status.ts` with:

```ts
import { Tool } from "@raycast/api";
import { setStatus } from "../api/status";

type Input = {
  /** The status message text. */
  message: string;
  /**
   * Optional absolute expiry as an ISO 8601 timestamp, preferably in UTC
   * (e.g. "2026-06-28T17:00:00Z"). Omit for a status that never expires.
   */
  expiry?: string;
  /**
   * Whether to also show the status above the compose box when people message
   * or @mention the user ("show when people message me"). Defaults to true.
   */
  pinned?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Set your Microsoft Teams status message?",
  info: [
    { name: "Message", value: input.message },
    { name: "Expiry", value: input.expiry ?? "Never" },
    { name: "Show when people message me", value: (input.pinned ?? true) ? "Yes" : "No" },
  ],
});

/**
 * Sets the signed-in user's Microsoft Teams status message.
 */
export default async function (input: Input) {
  let expiry: Date | null = null;
  if (input.expiry) {
    expiry = new Date(input.expiry);
    if (isNaN(expiry.getTime())) {
      throw new Error(`Invalid expiry timestamp: "${input.expiry}". Provide an ISO 8601 date-time.`);
    }
  }
  const pinned = input.pinned ?? true;
  await setStatus(input.message, pinned, expiry);
  return expiry
    ? `Set status message to "${input.message}" (expires ${expiry.toISOString()})`
    : `Set status message to "${input.message}" (no expiry)`;
}
```

- [ ] **Step 2: Update the `set-status` description in `package.json`**

Change the `set-status` entry's `description` (it previously said "always pinned") to:

```json
      "description": "Set your Microsoft Teams status message with an optional expiry. Shown above the compose box when people message you by default (pinned)."
```

- [ ] **Step 3: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/set-status.ts package.json
git commit -m "feat: add pinned input (default true) and confirmation to set-status

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec coverage:**
  - get/set/clear status → Task 3 (`get-status`, `set-status`, `clear-status`). ✓
  - `set-status` always pinned + optional `expiry` (ISO) + invalid-expiry error → Task 3 Step 2. ✓
  - `getStatus` reads `/me/presence`, strips pinned marker, expiry→ISO with Windows-zone map + 9999 guard, `published` passthrough → Task 2. ✓
  - `Status { message, expiry, published }` → Task 2 Step 1. ✓
  - `setStatus` omits expiry sentinel, writes UTC, `PINNED_NOTE` constant → Task 2 Step 1. ✓
  - Presence consistency: `clear-presence` + remove `"Reset"` from `set-presence` enum → Task 1. ✓
  - package.json: update `set-presence` description; add `clear-presence`, `get-status`, `set-status`, `clear-status` → Tasks 1 & 3. ✓
  - Shared `expiry` field name across get/set → Task 2 (`Status.expiry`) and Task 3 (`Input.expiry`). ✓
  - No confirmation dialogs → no `confirmation` export anywhere. ✓
  - Out of scope (other users, presence from set-status) → not implemented. ✓
- **Placeholder scan:** No TBD/TODO; all code shown in full.
- **Type consistency:** `getStatus`/`setStatus`/`clearStatus` names and signatures match between Task 2 (definition) and Task 3 (consumption). `Status` field names (`message`, `expiry`, `published`) consistent. `applyAvailability`/`presenceResultMessage` usage in Task 1 matches their existing signatures.
