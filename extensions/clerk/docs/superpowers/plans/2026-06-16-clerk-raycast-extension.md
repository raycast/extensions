# Clerk Raycast Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Raycast extension to browse and lightly administer Clerk users and organizations across multiple, switchable Clerk instances, with a seamless clipboard-driven authentication flow.

**Architecture:** Each Clerk "app" is a Clerk *instance* identified by its secret key, stored in Raycast LocalStorage. A small typed `lib/` layer (storage, client factory, error normalization, pagination/hooks) sits under four `view` commands (Manage Apps, Switch Active App, Search Users, Search Organizations) and shared components. Data is fetched with the official `@clerk/backend` SDK wrapped in `@raycast/utils` hooks; the SDK's `{ data, totalCount }` shape drives Raycast list pagination.

**Tech Stack:** TypeScript, React, `@raycast/api`, `@raycast/utils`, `@clerk/backend`, `vitest`.

**Spec:** `docs/superpowers/specs/2026-06-16-clerk-raycast-extension-design.md`

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/types.ts` | `InstanceType`, `ClerkApp` shared types |
| `src/lib/clerk.ts` | secret-key detection, instance-type derivation, default-name generation, dashboard URL, memoized client factory |
| `src/lib/storage.ts` | apps + activeAppId CRUD over LocalStorage |
| `src/lib/errors.ts` | normalize Clerk/network errors → `{ title, message }`; toast wrapper |
| `src/lib/pagination.ts` | pure pagination math (`getPageParams`, `computeHasMore`) |
| `src/lib/hooks.ts` | `useApps`, `useActiveApp`, `PAGE_SIZE` |
| `src/components/auth-guard.tsx` | empty-state + footer auth actions when not authenticated |
| `src/components/app-form.tsx` | add/edit a Clerk app (clipboard-aware) |
| `src/components/user-detail.tsx` | one user's detail + sessions |
| `src/components/user-orgs.tsx` | a user's org memberships |
| `src/components/org-members.tsx` | members of one org + membership mutations |
| `src/manage-apps.tsx` | Manage Apps command (auth) |
| `src/switch-app.tsx` | Switch Active App command |
| `src/search-users.tsx` | Search Users command |
| `src/search-organizations.tsx` | Search Organizations command |

Removed at the end: `src/view-users.tsx` (placeholder).

Note: `crypto.randomUUID` is used via `import { randomUUID } from "node:crypto"`. Raycast list pagination `page` is **0-indexed**.

---

## Task 1: Tooling & project setup

**Files:**
- Create: `vitest.config.ts`, `src/types.ts`
- Modify: `package.json`

- [ ] **Step 1: Initialize git** (the directory is not yet a repo)

Run:
```bash
cd /Users/filiphsandstrom/raycast/clerk
git init
git add -A
git commit -m "chore: snapshot raycast scaffold before clerk extension work"
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
pnpm add @clerk/backend
pnpm add -D vitest
```
Expected: `@clerk/backend` appears under `dependencies` and `vitest` under `devDependencies` in `package.json`.

- [ ] **Step 3: Add vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Add test scripts to `package.json`**

In the `scripts` object add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create shared types**

Create `src/types.ts`:
```ts
export type InstanceType = "development" | "production";

export type ClerkApp = {
  id: string;
  name: string;
  instanceType: InstanceType;
  secretKey: string;
};
```

- [ ] **Step 6: Verify the toolchain runs**

Run: `pnpm test`
Expected: vitest runs and reports "No test files found" (exit code 0 is fine; if it exits non-zero for "no tests", that's acceptable at this stage).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add @clerk/backend, vitest, and shared types"
```

---

## Task 2: `lib/clerk.ts` — key detection & client factory

**Files:**
- Create: `src/lib/clerk.ts`
- Test: `src/lib/clerk.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/clerk.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import {
  isClerkSecretKey,
  instanceTypeFromKey,
  defaultAppName,
  DASHBOARD_API_KEYS_URL,
} from "./clerk";

describe("isClerkSecretKey", () => {
  it("accepts test and live keys, trimming whitespace", () => {
    expect(isClerkSecretKey("sk_test_abc123")).toBe(true);
    expect(isClerkSecretKey("  sk_live_XYZ789  ")).toBe(true);
  });
  it("rejects non-keys", () => {
    expect(isClerkSecretKey("pk_test_abc")).toBe(false);
    expect(isClerkSecretKey("hello")).toBe(false);
    expect(isClerkSecretKey("")).toBe(false);
  });
});

describe("instanceTypeFromKey", () => {
  it("maps live keys to production and others to development", () => {
    expect(instanceTypeFromKey("sk_live_abc")).toBe("production");
    expect(instanceTypeFromKey("sk_test_abc")).toBe("development");
  });
});

describe("defaultAppName", () => {
  it("combines instance type with the last 4 characters", () => {
    expect(defaultAppName("sk_live_aaaa1234")).toBe("Production · 1234");
    expect(defaultAppName("sk_test_bbbbWXYZ")).toBe("Development · WXYZ");
  });
});

describe("DASHBOARD_API_KEYS_URL", () => {
  it("points at the Clerk dashboard API keys deep link", () => {
    expect(DASHBOARD_API_KEYS_URL).toBe("https://dashboard.clerk.com/last-active?path=api-keys");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/clerk.test.ts`
Expected: FAIL — `Cannot find module './clerk'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/clerk.ts`:
```ts
import { createClerkClient, type ClerkClient } from "@clerk/backend";
import type { ClerkApp, InstanceType } from "../types";

export const DASHBOARD_API_KEYS_URL = "https://dashboard.clerk.com/last-active?path=api-keys";

const SECRET_KEY_RE = /^sk_(test|live)_[A-Za-z0-9]+$/;

export function isClerkSecretKey(text: string): boolean {
  return SECRET_KEY_RE.test(text.trim());
}

export function instanceTypeFromKey(key: string): InstanceType {
  return key.trim().startsWith("sk_live_") ? "production" : "development";
}

export function defaultAppName(key: string): string {
  const trimmed = key.trim();
  const type = instanceTypeFromKey(trimmed);
  const label = type === "production" ? "Production" : "Development";
  return `${label} · ${trimmed.slice(-4)}`;
}

const clientCache = new Map<string, ClerkClient>();

export function clientFor(app: ClerkApp): ClerkClient {
  const cached = clientCache.get(app.secretKey);
  if (cached) return cached;
  const client = createClerkClient({ secretKey: app.secretKey });
  clientCache.set(app.secretKey, client);
  return client;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/clerk.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/clerk.ts src/lib/clerk.test.ts
git commit -m "feat: add clerk key detection and client factory"
```

---

## Task 3: `lib/storage.ts` — apps & active-app persistence

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`

- [ ] **Step 1: Write the failing test** (mocks `@raycast/api` LocalStorage with an in-memory store)

Create `src/lib/storage.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async (key: string) => store.get(key),
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  },
}));

import {
  getApps,
  addApp,
  updateApp,
  removeApp,
  getActiveAppId,
  setActiveAppId,
  getActiveApp,
} from "./storage";
import type { ClerkApp } from "../types";

const appA: ClerkApp = { id: "a", name: "A", instanceType: "production", secretKey: "sk_live_a" };
const appB: ClerkApp = { id: "b", name: "B", instanceType: "development", secretKey: "sk_test_b" };

beforeEach(() => store.clear());

describe("storage", () => {
  it("starts empty", async () => {
    expect(await getApps()).toEqual([]);
    expect(await getActiveAppId()).toBeUndefined();
  });

  it("makes the first added app active, but not later ones", async () => {
    await addApp(appA);
    expect(await getActiveAppId()).toBe("a");
    await addApp(appB);
    expect(await getActiveAppId()).toBe("a");
    expect((await getApps()).map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("updates an app in place", async () => {
    await addApp(appA);
    await updateApp({ ...appA, name: "Renamed" });
    expect((await getActiveApp())?.name).toBe("Renamed");
  });

  it("reassigns active when the active app is removed", async () => {
    await addApp(appA);
    await addApp(appB);
    await removeApp("a");
    expect(await getActiveAppId()).toBe("b");
    await removeApp("b");
    expect(await getActiveAppId()).toBeUndefined();
    expect(await getApps()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/storage.test.ts`
Expected: FAIL — `Cannot find module './storage'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/storage.ts`:
```ts
import { LocalStorage } from "@raycast/api";
import type { ClerkApp } from "../types";

const APPS_KEY = "clerk.apps";
const ACTIVE_KEY = "clerk.activeAppId";

export async function getApps(): Promise<ClerkApp[]> {
  const raw = await LocalStorage.getItem<string>(APPS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ClerkApp[];
  } catch {
    return [];
  }
}

export async function saveApps(apps: ClerkApp[]): Promise<void> {
  await LocalStorage.setItem(APPS_KEY, JSON.stringify(apps));
}

export async function getActiveAppId(): Promise<string | undefined> {
  return await LocalStorage.getItem<string>(ACTIVE_KEY);
}

export async function setActiveAppId(id: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_KEY, id);
}

export async function addApp(app: ClerkApp): Promise<void> {
  const apps = await getApps();
  apps.push(app);
  await saveApps(apps);
  if (apps.length === 1) await setActiveAppId(app.id);
}

export async function updateApp(app: ClerkApp): Promise<void> {
  const apps = await getApps();
  await saveApps(apps.map((a) => (a.id === app.id ? app : a)));
}

export async function removeApp(id: string): Promise<void> {
  const apps = (await getApps()).filter((a) => a.id !== id);
  await saveApps(apps);
  const activeId = await getActiveAppId();
  if (activeId === id) {
    if (apps.length > 0) await setActiveAppId(apps[0].id);
    else await LocalStorage.removeItem(ACTIVE_KEY);
  }
}

export async function getActiveApp(): Promise<ClerkApp | undefined> {
  const id = await getActiveAppId();
  if (!id) return undefined;
  return (await getApps()).find((a) => a.id === id);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: add LocalStorage-backed clerk app persistence"
```

---

## Task 4: `lib/errors.ts` — error normalization

**Files:**
- Create: `src/lib/errors.ts`
- Test: `src/lib/errors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/errors.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { normalizeClerkError } from "./errors";

function clerkError(status: number, message: string) {
  return { clerkError: true, status, errors: [{ code: "x", message }] };
}

describe("normalizeClerkError", () => {
  it("maps 401/403 to a key-rejected message", () => {
    expect(normalizeClerkError(clerkError(401, "nope")).title).toMatch(/rejected/i);
    expect(normalizeClerkError(clerkError(403, "nope")).title).toMatch(/rejected/i);
  });
  it("maps 429 to a rate-limit message", () => {
    expect(normalizeClerkError(clerkError(429, "slow")).title).toMatch(/rate limit/i);
  });
  it("uses the first clerk error message for other statuses", () => {
    expect(normalizeClerkError(clerkError(422, "bad slug")).message).toBe("bad slug");
  });
  it("falls back to the Error message for non-clerk errors", () => {
    const r = normalizeClerkError(new Error("network down"));
    expect(r.message).toBe("network down");
  });
  it("handles unknown values", () => {
    expect(normalizeClerkError("weird").message).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/errors.test.ts`
Expected: FAIL — `Cannot find module './errors'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/errors.ts`:
```ts
import { showToast, Toast } from "@raycast/api";

export type NormalizedError = { title: string; message: string };

type ClerkApiErrorShape = {
  clerkError: true;
  status: number;
  errors?: Array<{ message?: string }>;
};

function isClerkApiError(error: unknown): error is ClerkApiErrorShape {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as Record<string, unknown>).clerkError === true &&
    typeof (error as Record<string, unknown>).status === "number"
  );
}

export function normalizeClerkError(error: unknown): NormalizedError {
  if (isClerkApiError(error)) {
    const first = error.errors?.[0]?.message ?? "Request failed.";
    if (error.status === 401 || error.status === 403) {
      return {
        title: "Secret key was rejected",
        message: "Check this app in Manage Apps. " + first,
      };
    }
    if (error.status === 429) {
      return { title: "Rate limit reached", message: "Please wait and try again." };
    }
    return { title: "Clerk error", message: first };
  }
  if (error instanceof Error) {
    return { title: "Something went wrong", message: error.message };
  }
  return { title: "Something went wrong", message: String(error) };
}

export async function showClerkError(error: unknown): Promise<void> {
  const { title, message } = normalizeClerkError(error);
  await showToast({ style: Toast.Style.Failure, title, message });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/errors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/errors.ts src/lib/errors.test.ts
git commit -m "feat: add clerk error normalization"
```

---

## Task 5: `lib/pagination.ts` + `lib/hooks.ts`

**Files:**
- Create: `src/lib/pagination.ts`, `src/lib/hooks.ts`
- Test: `src/lib/pagination.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/pagination.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getPageParams, computeHasMore } from "./pagination";

describe("getPageParams", () => {
  it("converts a 0-indexed page into limit/offset", () => {
    expect(getPageParams(0, 50)).toEqual({ limit: 50, offset: 0 });
    expect(getPageParams(2, 50)).toEqual({ limit: 50, offset: 100 });
  });
});

describe("computeHasMore", () => {
  it("is true when more rows remain", () => {
    expect(computeHasMore(0, 50, 120)).toBe(true);
  });
  it("is false when the page reaches the end", () => {
    expect(computeHasMore(100, 20, 120)).toBe(false);
    expect(computeHasMore(0, 10, 10)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/pagination.test.ts`
Expected: FAIL — `Cannot find module './pagination'`.

- [ ] **Step 3: Write the pagination implementation**

Create `src/lib/pagination.ts`:
```ts
export function getPageParams(page: number, pageSize: number): { limit: number; offset: number } {
  return { limit: pageSize, offset: page * pageSize };
}

export function computeHasMore(offset: number, fetchedCount: number, totalCount: number): boolean {
  return offset + fetchedCount < totalCount;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/pagination.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the hooks (no unit test — thin wrappers over Raycast hooks)**

Create `src/lib/hooks.ts`:
```ts
import { useCachedPromise } from "@raycast/utils";
import { getApps, getActiveApp } from "./storage";

export const PAGE_SIZE = 50;

export function useApps() {
  return useCachedPromise(getApps, [], { initialData: [] });
}

export function useActiveApp() {
  return useCachedPromise(getActiveApp, []);
}
```

- [ ] **Step 6: Run the full suite**

Run: `pnpm test`
Expected: all test files PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pagination.ts src/lib/pagination.test.ts src/lib/hooks.ts
git commit -m "feat: add pagination helpers and app hooks"
```

---

## Task 6: `components/auth-guard.tsx` + `components/app-form.tsx`

**Files:**
- Create: `src/components/auth-guard.tsx`, `src/components/app-form.tsx`

- [ ] **Step 1: Write the add/edit form**

Create `src/components/app-form.tsx`:
```tsx
import { Action, ActionPanel, Clipboard, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useEffect, useState } from "react";
import type { ClerkApp } from "../types";
import {
  DASHBOARD_API_KEYS_URL,
  clientFor,
  defaultAppName,
  instanceTypeFromKey,
  isClerkSecretKey,
} from "../lib/clerk";
import { addApp, updateApp } from "../lib/storage";
import { showClerkError } from "../lib/errors";

export function AppForm(props: { app?: ClerkApp; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const editing = !!props.app;
  const [name, setName] = useState(props.app?.name ?? "");
  const [secretKey, setSecretKey] = useState(props.app?.secretKey ?? "");
  const [loading, setLoading] = useState(false);

  // Prefill from clipboard on first mount (add mode only).
  useEffect(() => {
    if (editing) return;
    (async () => {
      const text = (await Clipboard.readText()) ?? "";
      if (isClerkSecretKey(text)) {
        setSecretKey(text.trim());
        if (!name) setName(defaultAppName(text));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pasteFromClipboard() {
    const text = (await Clipboard.readText()) ?? "";
    if (!isClerkSecretKey(text)) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard has no Clerk secret key" });
      return;
    }
    setSecretKey(text.trim());
    if (!name) setName(defaultAppName(text));
  }

  async function submit() {
    const key = secretKey.trim();
    if (!isClerkSecretKey(key)) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a valid Clerk secret key" });
      return;
    }
    const finalName = name.trim() || defaultAppName(key);
    const app: ClerkApp = {
      id: props.app?.id ?? randomUUID(),
      name: finalName,
      instanceType: instanceTypeFromKey(key),
      secretKey: key,
    };
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Validating secret key" });
    try {
      await clientFor(app).users.getUserList({ limit: 1 });
      if (editing) await updateApp(app);
      else await addApp(app);
      toast.style = Toast.Style.Success;
      toast.title = editing ? "App updated" : "App added";
      props.onSaved?.();
      pop();
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    } finally {
      setLoading(false);
    }
  }

  const detected = isClerkSecretKey(secretKey) ? instanceTypeFromKey(secretKey) : undefined;

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={editing ? "Save App" : "Add App"} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Clerk Dashboard → API Keys" url={DASHBOARD_API_KEYS_URL} />
          <Action title="Paste Secret Key from Clipboard" onAction={pasteFromClipboard} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a Clerk instance by pasting its secret key. Open the dashboard to copy one." />
      <Form.TextField id="name" title="Name" placeholder="e.g. Acme Production" value={name} onChange={setName} />
      <Form.PasswordField
        id="secretKey"
        title="Secret Key"
        placeholder="sk_live_… or sk_test_…"
        value={secretKey}
        onChange={setSecretKey}
      />
      {detected && <Form.Description text={`Detected instance type: ${detected}`} />}
    </Form>
  );
}
```

- [ ] **Step 2: Write the AuthGuard**

Create `src/components/auth-guard.tsx`:
```tsx
import { Action, ActionPanel, Clipboard, Icon, List, Toast, showToast } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useEffect, useState } from "react";
import { AppForm } from "./app-form";
import {
  DASHBOARD_API_KEYS_URL,
  clientFor,
  defaultAppName,
  instanceTypeFromKey,
  isClerkSecretKey,
} from "../lib/clerk";
import { addApp } from "../lib/storage";
import { showClerkError } from "../lib/errors";

export function AuthActions(props: { onChanged: () => void }) {
  const [clipboardHasKey, setClipboardHasKey] = useState(false);

  useEffect(() => {
    (async () => {
      const text = (await Clipboard.readText()) ?? "";
      setClipboardHasKey(isClerkSecretKey(text));
    })();
  }, []);

  async function addFromClipboard() {
    const text = ((await Clipboard.readText()) ?? "").trim();
    if (!isClerkSecretKey(text)) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard has no Clerk secret key" });
      return;
    }
    const app = {
      id: randomUUID(),
      name: defaultAppName(text),
      instanceType: instanceTypeFromKey(text),
      secretKey: text,
    };
    const toast = await showToast({ style: Toast.Style.Animated, title: "Validating secret key" });
    try {
      await clientFor(app).users.getUserList({ limit: 1 });
      await addApp(app);
      toast.style = Toast.Style.Success;
      toast.title = `Added ${app.name}`;
      props.onChanged();
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <ActionPanel>
      {clipboardHasKey && (
        <Action title="Add App from Clipboard" icon={Icon.Clipboard} onAction={addFromClipboard} />
      )}
      <Action.Push
        title="Add App Manually…"
        icon={Icon.Plus}
        target={<AppForm onSaved={props.onChanged} />}
      />
      <Action.OpenInBrowser title="Open Clerk Dashboard → API Keys" url={DASHBOARD_API_KEYS_URL} />
    </ActionPanel>
  );
}

export function AuthGuard(props: { onChanged: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="No active Clerk app"
        description="Open the Clerk dashboard, copy a secret key, then add it here."
        actions={<AuthActions onChanged={props.onChanged} />}
      />
    </List>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/app-form.tsx src/components/auth-guard.tsx
git commit -m "feat: add app form and auth guard components"
```

---

## Task 7: Manage Apps command

**Files:**
- Create: `src/manage-apps.tsx`
- Modify: `package.json` (commands array)

- [ ] **Step 1: Add the command to the manifest**

In `package.json`, add this object to the `commands` array (keep `view-users` for now):
```json
{
  "name": "manage-apps",
  "title": "Manage Apps",
  "description": "Add, edit, remove, and activate Clerk instances",
  "mode": "view"
}
```

- [ ] **Step 2: Write the command**

Create `src/manage-apps.tsx`:
```tsx
import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { AppForm } from "./components/app-form";
import { AuthActions } from "./components/auth-guard";
import { useApps } from "./lib/hooks";
import { getActiveAppId, removeApp, setActiveAppId } from "./lib/storage";
import { useCachedPromise } from "@raycast/utils";
import type { ClerkApp } from "./types";

export default function ManageApps() {
  const { data: apps = [], isLoading, revalidate } = useApps();
  const { data: activeId, revalidate: revalidateActive } = useCachedPromise(getActiveAppId, []);

  function refresh() {
    revalidate();
    revalidateActive();
  }

  async function activate(app: ClerkApp) {
    await setActiveAppId(app.id);
    refresh();
    await showToast({ style: Toast.Style.Success, title: `Active app: ${app.name}` });
  }

  async function remove(app: ClerkApp) {
    const ok = await confirmAlert({
      title: `Remove ${app.name}?`,
      message: "This deletes the stored secret key from Raycast.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await removeApp(app.id);
    refresh();
    await showToast({ style: Toast.Style.Success, title: `Removed ${app.name}` });
  }

  return (
    <List isLoading={isLoading}>
      {apps.length === 0 ? (
        <List.EmptyView
          icon={Icon.Key}
          title="No Clerk apps yet"
          description="Open the Clerk dashboard, copy a secret key, then add it here."
          actions={<AuthActions onChanged={refresh} />}
        />
      ) : (
        apps.map((app) => (
          <List.Item
            key={app.id}
            icon={app.id === activeId ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            title={app.name}
            accessories={[
              { tag: app.instanceType },
              ...(app.id === activeId ? [{ tag: { value: "Active", color: Color.Green } }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action title="Set as Active" icon={Icon.Check} onAction={() => activate(app)} />
                <Action.Push title="Edit App" icon={Icon.Pencil} target={<AppForm app={app} onSaved={refresh} />} />
                <Action.Push
                  title="Add App"
                  icon={Icon.Plus}
                  target={<AppForm onSaved={refresh} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title="Remove App"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => remove(app)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `pnpm dev`
Verify in Raycast (with a real Clerk secret key copied to the clipboard):
- Empty state shows "Add App from Clipboard", "Add App Manually…", and "Open Clerk Dashboard → API Keys".
- "Add App from Clipboard" validates and adds the app; it becomes active.
- "Add App Manually…" opens a form prefilled from the clipboard; an invalid key shows a failure toast and does not save.
- "Set as Active", "Edit App", and "Remove App" (with confirm) all work and the list refreshes.

- [ ] **Step 4: Commit**

```bash
git add src/manage-apps.tsx package.json
git commit -m "feat: add Manage Apps command"
```

---

## Task 8: Switch Active App command

**Files:**
- Create: `src/switch-app.tsx`
- Modify: `package.json` (commands array)

- [ ] **Step 1: Add the command to the manifest**

Add to the `commands` array:
```json
{
  "name": "switch-app",
  "title": "Switch Active App",
  "description": "Switch which configured Clerk instance is active",
  "mode": "view"
}
```

- [ ] **Step 2: Write the command**

Create `src/switch-app.tsx`:
```tsx
import { Action, ActionPanel, Color, Icon, List, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AuthActions } from "./components/auth-guard";
import { useApps } from "./lib/hooks";
import { getActiveAppId, setActiveAppId } from "./lib/storage";
import type { ClerkApp } from "./types";

export default function SwitchApp() {
  const { data: apps = [], isLoading, revalidate } = useApps();
  const { data: activeId, revalidate: revalidateActive } = useCachedPromise(getActiveAppId, []);

  async function activate(app: ClerkApp) {
    await setActiveAppId(app.id);
    await showHUD(`Switched to ${app.name}`);
  }

  return (
    <List isLoading={isLoading}>
      {apps.length === 0 ? (
        <List.EmptyView
          icon={Icon.Key}
          title="No Clerk apps yet"
          description="Add an app in Manage Apps first."
          actions={
            <AuthActions
              onChanged={() => {
                revalidate();
                revalidateActive();
              }}
            />
          }
        />
      ) : (
        apps.map((app) => (
          <List.Item
            key={app.id}
            icon={app.id === activeId ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            title={app.name}
            accessories={[{ tag: app.instanceType }]}
            actions={
              <ActionPanel>
                <Action title="Set as Active" icon={Icon.Check} onAction={() => activate(app)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `pnpm dev`
Verify: the list shows configured apps with the active one marked; selecting another shows the "Switched to …" HUD; empty state offers the auth actions.

- [ ] **Step 4: Commit**

```bash
git add src/switch-app.tsx package.json
git commit -m "feat: add Switch Active App command"
```

---

## Task 9: Search Users (+ detail, sessions, user orgs)

**Files:**
- Create: `src/search-users.tsx`, `src/components/user-detail.tsx`, `src/components/user-orgs.tsx`
- Modify: `package.json` (commands array)

- [ ] **Step 1: Add the command to the manifest**

Add to the `commands` array:
```json
{
  "name": "search-users",
  "title": "Search Users",
  "description": "Search and manage users in the active Clerk instance",
  "mode": "view"
}
```

- [ ] **Step 2: Write the user-orgs component**

Create `src/components/user-orgs.tsx`:
```tsx
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";
import { OrgMembers } from "./org-members";

export function UserOrgs(props: { app: ClerkApp; userId: string; userLabel: string }) {
  const { data, isLoading } = useCachedPromise(
    async (userId: string) => {
      const res = await clientFor(props.app).users.getOrganizationMembershipList({ userId });
      return res.data;
    },
    [props.userId],
    { onError: showClerkError },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Organizations · ${props.userLabel}`}>
      {(data ?? []).map((m) => (
        <List.Item
          key={m.id}
          icon={Icon.Building}
          title={m.organization.name}
          subtitle={m.organization.slug ?? undefined}
          accessories={[{ tag: m.role }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Members"
                icon={Icon.PersonLines}
                target={<OrgMembers app={props.app} organizationId={m.organization.id} orgName={m.organization.name} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 3: Write the user-detail component**

Create `src/components/user-detail.tsx`:
```tsx
import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { User } from "@clerk/backend";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";

function primaryEmail(user: User): string {
  return user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
    ?? user.emailAddresses[0]?.emailAddress
    ?? "—";
}

function fullName(user: User): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || primaryEmail(user);
}

function fmtDate(ms: number | null): string {
  return ms ? new Date(ms).toLocaleString() : "—";
}

export function UserSessions(props: { app: ClerkApp; userId: string }) {
  const { data, isLoading, mutate } = useCachedPromise(
    async (userId: string) => {
      const res = await clientFor(props.app).sessions.getSessionList({ userId });
      return res.data;
    },
    [props.userId],
    { onError: showClerkError },
  );

  async function revoke(sessionId: string) {
    await mutate(clientFor(props.app).sessions.revokeSession(sessionId));
  }

  return (
    <List isLoading={isLoading} navigationTitle="Sessions">
      {(data ?? []).map((s) => (
        <List.Item
          key={s.id}
          icon={Icon.Globe}
          title={s.id}
          accessories={[{ tag: s.status }, { date: new Date(s.lastActiveAt) }]}
          actions={
            <ActionPanel>
              <Action
                title="Revoke Session"
                style={Action.Style.Destructive}
                icon={Icon.XMarkCircle}
                onAction={() => revoke(s.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function UserDetail(props: { app: ClerkApp; userId: string }) {
  const { data: user, isLoading } = useCachedPromise(
    async (userId: string) => clientFor(props.app).users.getUser(userId),
    [props.userId],
    { onError: showClerkError },
  );

  const md = user
    ? `# ${fullName(user)}\n\n${user.imageUrl ? `![avatar](${user.imageUrl})` : ""}`
    : "Loading…";

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      navigationTitle={user ? fullName(user) : "User"}
      metadata={
        user && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="User ID" text={user.id} />
            <Detail.Metadata.Label title="Email" text={primaryEmail(user)} />
            <Detail.Metadata.Label title="Username" text={user.username ?? "—"} />
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={user.banned ? "Banned" : "Active"}
                color={user.banned ? Color.Red : Color.Green}
              />
              {user.twoFactorEnabled && <Detail.Metadata.TagList.Item text="2FA" color={Color.Blue} />}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Created" text={fmtDate(user.createdAt)} />
            <Detail.Metadata.Label title="Last sign-in" text={fmtDate(user.lastSignInAt)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Public metadata" text={JSON.stringify(user.publicMetadata)} />
            <Detail.Metadata.Label title="Private metadata" text={JSON.stringify(user.privateMetadata)} />
          </Detail.Metadata>
        )
      }
      actions={
        user && (
          <ActionPanel>
            <Action.Push
              title="View Sessions"
              icon={Icon.Globe}
              target={<UserSessions app={props.app} userId={user.id} />}
            />
            <Action.CopyToClipboard title="Copy User ID" content={user.id} />
            <Action.CopyToClipboard title="Copy Email" content={primaryEmail(user)} />
          </ActionPanel>
        )
      }
    />
  );
}
```

- [ ] **Step 4: Write the Search Users command**

Create `src/search-users.tsx`:
```tsx
import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { User } from "@clerk/backend";
import { useActiveApp } from "./lib/hooks";
import { AuthGuard } from "./components/auth-guard";
import { UserDetail } from "./components/user-detail";
import { UserOrgs } from "./components/user-orgs";
import { clientFor } from "./lib/clerk";
import { getPageParams, computeHasMore } from "./lib/pagination";
import { PAGE_SIZE } from "./lib/hooks";
import { showClerkError } from "./lib/errors";
import type { ClerkApp } from "./types";

function primaryEmail(user: User): string {
  return user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
    ?? user.emailAddresses[0]?.emailAddress
    ?? "—";
}
function fullName(user: User): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || primaryEmail(user);
}

function UsersList({ app }: { app: ClerkApp }) {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (query: string) => async (options: { page: number }) => {
      const { limit, offset } = getPageParams(options.page, PAGE_SIZE);
      const res = await clientFor(app).users.getUserList({ query: query || undefined, limit, offset });
      return { data: res.data, hasMore: computeHasMore(offset, res.data.length, res.totalCount) };
    },
    [searchText],
    { onError: showClerkError },
  );

  async function runMutation(action: Promise<unknown>, optimistic: (u: User[]) => User[], title: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await mutate(action, { optimisticUpdate: optimistic });
      toast.style = Toast.Style.Success;
      toast.title = `${title} — done`;
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  async function ban(user: User) {
    await runMutation(
      clientFor(app).users.banUser(user.id),
      (users) => users.map((u) => (u.id === user.id ? ({ ...u, banned: true } as User) : u)),
      `Banning ${fullName(user)}`,
    );
  }
  async function unban(user: User) {
    await runMutation(
      clientFor(app).users.unbanUser(user.id),
      (users) => users.map((u) => (u.id === user.id ? ({ ...u, banned: false } as User) : u)),
      `Unbanning ${fullName(user)}`,
    );
  }
  async function del(user: User) {
    const ok = await confirmAlert({
      title: `Delete ${fullName(user)}?`,
      message: "This permanently deletes the user in Clerk.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await runMutation(
      clientFor(app).users.deleteUser(user.id),
      (users) => users.filter((u) => u.id !== user.id),
      `Deleting ${fullName(user)}`,
    );
  }
  async function revokeSessions(user: User) {
    await runMutation(
      (async () => {
        const sessions = await clientFor(app).sessions.getSessionList({ userId: user.id, status: "active" });
        await Promise.all(sessions.data.map((s) => clientFor(app).sessions.revokeSession(s.id)));
      })(),
      (users) => users,
      `Revoking sessions for ${fullName(user)}`,
    );
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search users…"
    >
      {(data ?? []).map((user) => (
        <List.Item
          key={user.id}
          icon={user.imageUrl ? { source: user.imageUrl } : Icon.Person}
          title={fullName(user)}
          subtitle={primaryEmail(user)}
          accessories={[
            ...(user.banned ? [{ tag: { value: "Banned", color: Color.Red } }] : []),
            ...(user.lastSignInAt ? [{ date: new Date(user.lastSignInAt), tooltip: "Last sign-in" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Sidebar} target={<UserDetail app={app} userId={user.id} />} />
              <Action.Push
                title="View Organizations"
                icon={Icon.Building}
                target={<UserOrgs app={app} userId={user.id} userLabel={fullName(user)} />}
              />
              {user.banned ? (
                <Action title="Unban User" icon={Icon.Checkmark} onAction={() => unban(user)} />
              ) : (
                <Action title="Ban User" icon={Icon.XMarkCircle} onAction={() => ban(user)} />
              )}
              <Action title="Revoke All Sessions" icon={Icon.Logout} onAction={() => revokeSessions(user)} />
              <Action
                title="Delete User"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => del(user)}
              />
              <Action.CopyToClipboard title="Copy User ID" content={user.id} />
              <Action.CopyToClipboard title="Copy Email" content={primaryEmail(user)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function SearchUsers() {
  const { data: app, isLoading, revalidate } = useActiveApp();
  if (isLoading) return <List isLoading />;
  if (!app) return <AuthGuard onChanged={revalidate} />;
  return <UsersList app={app} />;
}
```

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (If `User`/`Session` fields differ from the SDK version installed, adjust field names to match `@clerk/backend` types — do not invent fields.)

- [ ] **Step 6: Manual verification**

Run: `pnpm dev`
Verify: list loads users for the active app; search filters server-side; scrolling loads more pages; View Details shows metadata and sessions; Ban/Unban toggles with optimistic update; Revoke All Sessions succeeds; Delete asks for confirmation and removes the row; View Organizations lists the user's orgs. With no active app, the auth empty-state appears.

- [ ] **Step 7: Commit**

```bash
git add src/search-users.tsx src/components/user-detail.tsx src/components/user-orgs.tsx package.json
git commit -m "feat: add Search Users command with detail, sessions, and user actions"
```

---

## Task 10: Search Organizations (+ members, create org)

**Files:**
- Create: `src/search-organizations.tsx`, `src/components/org-members.tsx`
- Modify: `package.json` (commands array)

- [ ] **Step 1: Add the command to the manifest**

Add to the `commands` array:
```json
{
  "name": "search-organizations",
  "title": "Search Organizations",
  "description": "Search organizations and manage members in the active Clerk instance",
  "mode": "view"
}
```

- [ ] **Step 2: Write the org-members component**

Create `src/components/org-members.tsx`:
```tsx
import { Action, ActionPanel, Alert, Form, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { OrganizationMembership } from "@clerk/backend";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { getPageParams, computeHasMore } from "../lib/pagination";
import { PAGE_SIZE } from "../lib/hooks";
import { showClerkError } from "../lib/errors";
import { UserDetail } from "./user-detail";

function memberLabel(m: OrganizationMembership): string {
  const d = m.publicUserData;
  return [d?.firstName, d?.lastName].filter(Boolean).join(" ") || d?.identifier || m.id;
}

function ChangeRoleForm(props: { app: ClerkApp; organizationId: string; userId: string; current: string; onDone: () => void }) {
  const { pop } = useNavigation();
  const [role, setRole] = useState(props.current);

  async function submit() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating role" });
    try {
      await clientFor(props.app).organizations.updateOrganizationMembership({
        organizationId: props.organizationId,
        userId: props.userId,
        role: role.trim(),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Role updated";
      props.onDone();
      pop();
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Role" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="preset" title="Common Roles" value={role} onChange={setRole}>
        <Form.Dropdown.Item value="org:admin" title="org:admin" />
        <Form.Dropdown.Item value="org:member" title="org:member" />
      </Form.Dropdown>
      <Form.TextField id="role" title="Role (custom allowed)" value={role} onChange={setRole} />
    </Form>
  );
}

export function OrgMembers(props: { app: ClerkApp; organizationId: string; orgName: string }) {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (query: string) => async (options: { page: number }) => {
      const { limit, offset } = getPageParams(options.page, PAGE_SIZE);
      const res = await clientFor(props.app).organizations.getOrganizationMembershipList({
        organizationId: props.organizationId,
        query: query || undefined,
        limit,
        offset,
      });
      return { data: res.data, hasMore: computeHasMore(offset, res.data.length, res.totalCount) };
    },
    [searchText],
    { onError: showClerkError },
  );

  async function removeMember(m: OrganizationMembership) {
    const userId = m.publicUserData?.userId;
    if (!userId) return;
    const ok = await confirmAlert({
      title: `Remove ${memberLabel(m)}?`,
      message: "This removes the member from the organization.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Removing member" });
    try {
      await mutate(
        clientFor(props.app).organizations.deleteOrganizationMembership({
          organizationId: props.organizationId,
          userId,
        }),
        { optimisticUpdate: (list) => list.filter((x) => x.id !== m.id) },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Member removed";
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      throttle
      navigationTitle={`Members · ${props.orgName}`}
      searchBarPlaceholder="Search members…"
    >
      {(data ?? []).map((m) => {
        const userId = m.publicUserData?.userId;
        return (
          <List.Item
            key={m.id}
            icon={m.publicUserData?.imageUrl ? { source: m.publicUserData.imageUrl } : Icon.Person}
            title={memberLabel(m)}
            subtitle={m.publicUserData?.identifier ?? undefined}
            accessories={[{ tag: m.role }]}
            actions={
              <ActionPanel>
                {userId && (
                  <Action.Push
                    title="View User Details"
                    icon={Icon.Sidebar}
                    target={<UserDetail app={props.app} userId={userId} />}
                  />
                )}
                {userId && (
                  <Action.Push
                    title="Change Role"
                    icon={Icon.Pencil}
                    target={
                      <ChangeRoleForm
                        app={props.app}
                        organizationId={props.organizationId}
                        userId={userId}
                        current={m.role}
                        onDone={() => mutate()}
                      />
                    }
                  />
                )}
                <Action
                  title="Remove Member"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeMember(m)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
```

- [ ] **Step 3: Write the Search Organizations command**

Create `src/search-organizations.tsx`:
```tsx
import { Action, ActionPanel, Alert, Form, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { Organization } from "@clerk/backend";
import { useActiveApp, PAGE_SIZE } from "./lib/hooks";
import { AuthGuard } from "./components/auth-guard";
import { OrgMembers } from "./components/org-members";
import { clientFor } from "./lib/clerk";
import { getPageParams, computeHasMore } from "./lib/pagination";
import { showClerkError } from "./lib/errors";
import type { ClerkApp } from "./types";

function CreateOrgForm({ app, onDone }: { app: ClerkApp; onDone: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  async function submit() {
    if (!name.trim() || !createdBy.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name and Created-by user ID are required" });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating organization" });
    try {
      await clientFor(app).organizations.createOrganization({
        name: name.trim(),
        slug: slug.trim() || undefined,
        createdBy: createdBy.trim(),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Organization created";
      onDone();
      pop();
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Organization" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <Form.TextField id="slug" title="Slug (optional)" value={slug} onChange={setSlug} />
      <Form.TextField
        id="createdBy"
        title="Created by (user ID)"
        placeholder="user_…"
        value={createdBy}
        onChange={setCreatedBy}
      />
      <Form.Description text="Clerk requires the user ID of the creator." />
    </Form>
  );
}

function OrgsList({ app }: { app: ClerkApp }) {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (query: string) => async (options: { page: number }) => {
      const { limit, offset } = getPageParams(options.page, PAGE_SIZE);
      const res = await clientFor(app).organizations.getOrganizationList({
        query: query || undefined,
        limit,
        offset,
      });
      return { data: res.data, hasMore: computeHasMore(offset, res.data.length, res.totalCount) };
    },
    [searchText],
    { onError: showClerkError },
  );

  async function del(org: Organization) {
    const ok = await confirmAlert({
      title: `Delete ${org.name}?`,
      message: "This permanently deletes the organization in Clerk.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${org.name}` });
    try {
      await mutate(clientFor(app).organizations.deleteOrganization(org.id), {
        optimisticUpdate: (list) => list.filter((o) => o.id !== org.id),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Organization deleted";
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search organizations…"
    >
      {(data ?? []).map((org) => (
        <List.Item
          key={org.id}
          icon={org.imageUrl ? { source: org.imageUrl } : Icon.Building}
          title={org.name}
          subtitle={org.slug ?? undefined}
          accessories={[
            ...(typeof org.membersCount === "number" ? [{ text: `${org.membersCount} members` }] : []),
            { date: new Date(org.createdAt), tooltip: "Created" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Members"
                icon={Icon.PersonLines}
                target={<OrgMembers app={app} organizationId={org.id} orgName={org.name} />}
              />
              <Action.Push
                title="Create Organization"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateOrgForm app={app} onDone={() => mutate()} />}
              />
              <Action
                title="Delete Organization"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => del(org)}
              />
              <Action.CopyToClipboard title="Copy Org ID" content={org.id} />
              {org.slug && <Action.CopyToClipboard title="Copy Slug" content={org.slug} />}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function SearchOrganizations() {
  const { data: app, isLoading, revalidate } = useActiveApp();
  if (isLoading) return <List isLoading />;
  if (!app) return <AuthGuard onChanged={revalidate} />;
  return <OrgsList app={app} />;
}
```

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (If `Organization`/`OrganizationMembership` fields differ from the installed SDK, adjust to match the SDK types — do not invent fields.)

- [ ] **Step 5: Manual verification**

Run: `pnpm dev`
Verify: organizations load and paginate; search filters; View Members lists members with role badges; Change Role updates (preset + custom); Remove Member confirms and removes; Create Organization requires name + createdBy and creates; Delete Organization confirms and removes. No-active-app shows the auth empty-state.

- [ ] **Step 6: Commit**

```bash
git add src/search-organizations.tsx src/components/org-members.tsx package.json
git commit -m "feat: add Search Organizations command with members and org actions"
```

---

## Task 11: Cleanup, docs, and final verification

**Files:**
- Delete: `src/view-users.tsx`
- Modify: `package.json` (remove `view-users` command), `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Remove the placeholder command**

Delete `src/view-users.tsx` and remove the `view-users` object from the `commands` array in `package.json`.

- [ ] **Step 2: Update README**

Replace `README.md` with:
```markdown
# Clerk

Browse and lightly administer Clerk users and organizations across multiple, switchable Clerk instances, directly from Raycast.

## Commands

- **Manage Apps** — add/edit/remove Clerk instances and pick the active one. Open the Clerk dashboard, copy a secret key, and add it (auto-detected from your clipboard).
- **Switch Active App** — quickly change which instance is active.
- **Search Users** — search users, view details and sessions, ban/unban, revoke sessions, delete, and view a user's organizations.
- **Search Organizations** — search organizations, view/manage members (change role, remove), create and delete organizations.

## Authentication

Each "app" is a Clerk **instance**, identified by its secret key (`sk_live_…` / `sk_test_…`) from the [API keys page](https://dashboard.clerk.com/last-active?path=api-keys). A Clerk secret key is scoped to a single instance; there is no public API to list your applications, so instances are added manually.

## Security note

Secret keys are stored in Raycast **LocalStorage**, which is local to your machine but **not encrypted at rest**. Keys are only sent to `api.clerk.com`. Remove an app from **Manage Apps** to delete its stored key.
```

- [ ] **Step 3: Update CHANGELOG**

Replace `CHANGELOG.md` with:
```markdown
# Clerk Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Manage multiple Clerk instances with a clipboard-driven auth flow
- Search users: details, sessions, ban/unban, revoke sessions, delete, view organizations
- Search organizations: members, change role, remove member, create/delete organization
- Switch the active instance
```

- [ ] **Step 4: Run the full test suite**

Run: `pnpm test`
Expected: all unit tests PASS.

- [ ] **Step 5: Lint**

Run: `pnpm lint`
Expected: no errors. Fix any reported issues with `pnpm fix-lint`.

- [ ] **Step 6: Build**

Run: `pnpm build`
Expected: `ray build` completes successfully with all four commands compiled and no missing-file errors.

- [ ] **Step 7: Final manual smoke test**

Run: `pnpm dev`
Verify end-to-end: add an app from clipboard → search users → ban then unban a test user → open a user's organizations → search organizations → open members → change a role back and forth → switch active app → confirm only four commands appear in Raycast.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove placeholder command, add docs, finalize"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** multi-instance model (Tasks 2,3,6–8); read browsing of users/orgs/memberships (Tasks 9,10); curated mutations — ban/unban/delete/revoke (Task 9), create/delete org, change role, remove member (Task 10); seamless clipboard auth + dashboard link (Tasks 6,7); footer auth link via AuthGuard (Tasks 6,9,10); error handling (Task 4, used throughout); LocalStorage storage (Task 3) + README note (Task 11); vitest tests (Tasks 2–5). All spec sections map to tasks.
- **Placeholder scan:** no TBD/TODO; every code step contains full code; commands and verification have exact invocations.
- **Type consistency:** `ClerkApp`/`InstanceType` (types.ts) used consistently; `clientFor`, `isClerkSecretKey`, `instanceTypeFromKey`, `defaultAppName` (clerk.ts); `getPageParams`/`computeHasMore` (pagination.ts); `PAGE_SIZE`, `useApps`, `useActiveApp` (hooks.ts); `showClerkError`/`normalizeClerkError` (errors.ts) — names match across all tasks.
- **Known adjustment point:** exact field names on `@clerk/backend` `User`/`Organization`/`OrganizationMembership`/`Session` types depend on the installed SDK version; Tasks 9–10 instruct matching the SDK types rather than inventing fields.
