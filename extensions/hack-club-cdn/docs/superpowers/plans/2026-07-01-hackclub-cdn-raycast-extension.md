# Hack Club CDN Raycast Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a macOS-only Raycast extension with three commands — a fast clipboard-based
upload, a deliberate file-picker/paste-path upload, and a local upload history browser — for
the Hack Club CDN.

**Architecture:** Three thin Raycast command entry points (`src/upload-clipboard-file.ts`,
`src/upload-file.tsx`, `src/recent-uploads.tsx`) sit on top of four small, independently
unit-tested library modules (`src/lib/types.ts`, `src/lib/preferences.ts`,
`src/lib/uploadHistory.ts`, `src/lib/clipboardResolver.ts`, `src/lib/cdnClient.ts`) that
handle all non-UI logic: clipboard sniffing, the CDN's REST API, and local history storage.
Commands themselves are verified via TypeScript type-checking, `ray lint`, and manual
`ray develop` runs, since Raycast's UI components don't render to a testable DOM.

**Tech Stack:** TypeScript, `@raycast/api`, `@raycast/utils`, Node's built-in `fetch`/`FormData`/`fs`,
Vitest (new dev dependency, added in Task 1) for unit tests.

Reference spec: `docs/superpowers/specs/2026-07-01-hackclub-cdn-raycast-extension-design.md`
Reference research: `docs/raycast-extension-development.md`, `docs/hackclub-cdn-api.md`

## Global Constraints

- Platform: macOS only (`"platforms": ["macOS"]` in the manifest).
- Single file per invocation only — no multi-file/batch upload in v1.
- No in-extension OAuth or account creation — only a `password`-type `apiToken` extension preference.
- "Recent Uploads" is local-only (`LocalStorage`-backed), newest-first, capped at 200 entries — there is no server-side listing API to reconcile against.
- The `upload_from_url` loop guard must compare `new URL(text).hostname === "cdn.hackclub.com"` — never a string prefix or `.includes()` check.
- Never pass raw request/response objects (which may carry the `Authorization` header) to `console.error`, a `Toast`/`HUD` message, or any other user-facing or logged surface — only extracted, specific fields.
- `DELETE /api/v4/upload/:id` returning `404` must be treated as success (the upload is already gone either way).
- An actual Finder file-copy on the clipboard uploads with **no confirmation**. Clipboard text resolved to a local file path, or resolved to a URL, must show a native `confirmAlert()` before uploading.
- No pre-upload quota/size pre-check in v1 — that would require calling `/api/v4/me` to learn the user's tier, which is out of scope; the API itself rejects oversized files with a `402` that `cdnClient` already surfaces with quota details.
- "Upload Clipboard File" and "Upload File" must have clearly distinct titles/subtitles/keywords in the manifest — not read as interchangeable siblings.

---

## Task 1: Test tooling (Vitest)

**Files:**
- Modify: `package.json` (add `vitest` dev dependency, add `test` script)
- Create: `vitest.config.ts`
- Create: `src/lib/sanity.test.ts` (throwaway smoke test, deleted at the end of this task)

**Interfaces:**
- Produces: `npm test` runs Vitest once (`vitest run`) and exits non-zero on failure — every later task's test step depends on this.

- [ ] **Step 1: Install Vitest**

Run: `cd /Users/garyhtou/Code/garyhtou/hackclub-cdn && npm install --save-dev vitest`

Expected: `package.json`'s `devDependencies` gains a `vitest` entry; `package-lock.json` updates.

- [ ] **Step 2: Add the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 3: Add the `test` script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 4: Write a throwaway smoke test**

Create `src/lib/sanity.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("sanity", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it to confirm the toolchain works**

Run: `npm test`
Expected: `PASS`, 1 test passed.

- [ ] **Step 6: Delete the smoke test**

Run: `rm src/lib/sanity.test.ts`

- [ ] **Step 7: Commit**

```bash
git init -q 2>/dev/null; git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add Vitest for unit testing lib modules"
```

(If this is the first commit in a repo that isn't yet initialized, `git init` above handles that; skip it if `.git` already exists.)

---

## Task 2: Shared types and preferences module

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/preferences.ts`
- Test: `src/lib/preferences.test.ts`

**Interfaces:**
- Produces:
  - `UploadRecord` type: `{ id: string; filename: string; url: string; size: number; contentType: string; createdAt: string; sourceType: "file" | "url" }`
  - `CdnApiError` class: `extends Error`, constructed as `new CdnApiError(message: string, status: number)`, exposes `.status`
  - `ClipboardResolution` type: `{ type: "file"; path: string; needsConfirm: false } | { type: "path-text"; path: string; needsConfirm: true } | { type: "url"; url: string; needsConfirm: true } | { type: "none" }`
  - `getApiToken(): string` — reads the `apiToken` preference

- [ ] **Step 1: Create the shared types**

Create `src/lib/types.ts`:

```ts
export interface UploadRecord {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
  createdAt: string;
  sourceType: "file" | "url";
}

export class CdnApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CdnApiError";
    this.status = status;
  }
}

export type ClipboardResolution =
  | { type: "file"; path: string; needsConfirm: false }
  | { type: "path-text"; path: string; needsConfirm: true }
  | { type: "url"; url: string; needsConfirm: true }
  | { type: "none" };
```

- [ ] **Step 2: Write the failing test for `getApiToken`**

Create `src/lib/preferences.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({ apiToken: "sk_cdn_test123" })),
}));

import { getApiToken } from "./preferences";

describe("getApiToken", () => {
  it("returns the apiToken preference value", () => {
    expect(getApiToken()).toBe("sk_cdn_test123");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- preferences`
Expected: FAIL — `Cannot find module './preferences'` (or similar; the file doesn't exist yet).

- [ ] **Step 4: Implement `preferences.ts`**

Create `src/lib/preferences.ts`:

```ts
import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  apiToken: string;
}

export function getApiToken(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiToken;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- preferences`
Expected: PASS, 1 test passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/preferences.ts src/lib/preferences.test.ts
git commit -m "feat: add shared types and preferences accessor"
```

---

## Task 3: Upload history storage

**Files:**
- Create: `src/lib/uploadHistory.ts`
- Test: `src/lib/uploadHistory.test.ts`

**Interfaces:**
- Consumes: `UploadRecord` from `src/lib/types.ts` (Task 2)
- Produces:
  - `getUploads(): Promise<UploadRecord[]>`
  - `addUpload(record: UploadRecord): Promise<void>`
  - `removeUpload(id: string): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/uploadHistory.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadRecord } from "./types";

const store = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(async (key: string) => store.get(key)),
    setItem: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  },
}));

import { addUpload, getUploads, removeUpload } from "./uploadHistory";

function makeRecord(id: string): UploadRecord {
  return {
    id,
    filename: `${id}.png`,
    url: `https://cdn.hackclub.com/${id}/${id}.png`,
    size: 1024,
    contentType: "image/png",
    createdAt: "2026-07-01T00:00:00.000Z",
    sourceType: "file",
  };
}

beforeEach(() => {
  store.clear();
});

describe("uploadHistory", () => {
  it("returns an empty array when nothing is stored", async () => {
    expect(await getUploads()).toEqual([]);
  });

  it("adds an upload to the front of the list", async () => {
    await addUpload(makeRecord("a"));
    await addUpload(makeRecord("b"));
    const uploads = await getUploads();
    expect(uploads.map((u) => u.id)).toEqual(["b", "a"]);
  });

  it("caps history at 200 entries, dropping the oldest", async () => {
    for (let i = 0; i < 201; i++) {
      await addUpload(makeRecord(`r${i}`));
    }
    const uploads = await getUploads();
    expect(uploads).toHaveLength(200);
    expect(uploads[0].id).toBe("r200");
    expect(uploads.find((u) => u.id === "r0")).toBeUndefined();
  });

  it("removes an upload by id", async () => {
    await addUpload(makeRecord("a"));
    await addUpload(makeRecord("b"));
    await removeUpload("a");
    const uploads = await getUploads();
    expect(uploads.map((u) => u.id)).toEqual(["b"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- uploadHistory`
Expected: FAIL — `Cannot find module './uploadHistory'`.

- [ ] **Step 3: Implement `uploadHistory.ts`**

Create `src/lib/uploadHistory.ts`:

```ts
import { LocalStorage } from "@raycast/api";
import type { UploadRecord } from "./types";

const STORAGE_KEY = "uploads";
const MAX_ENTRIES = 200;

export async function getUploads(): Promise<UploadRecord[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  return JSON.parse(raw) as UploadRecord[];
}

export async function addUpload(record: UploadRecord): Promise<void> {
  const uploads = await getUploads();
  const updated = [record, ...uploads].slice(0, MAX_ENTRIES);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function removeUpload(id: string): Promise<void> {
  const uploads = await getUploads();
  const updated = uploads.filter((upload) => upload.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- uploadHistory`
Expected: PASS, 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/uploadHistory.ts src/lib/uploadHistory.test.ts
git commit -m "feat: add local upload history storage"
```

---

## Task 4: Clipboard resolver

**Files:**
- Create: `src/lib/clipboardResolver.ts`
- Test: `src/lib/clipboardResolver.test.ts`

**Interfaces:**
- Consumes: `ClipboardResolution` from `src/lib/types.ts` (Task 2)
- Produces:
  - `resolveClipboardInput(): Promise<ClipboardResolution>`
  - `isCdnUploadableUrl(text: string): boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/clipboardResolver.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const clipboardRead = vi.fn();

vi.mock("@raycast/api", () => ({
  Clipboard: { read: clipboardRead },
}));

const existsSync = vi.fn();

vi.mock("fs", () => ({
  existsSync,
}));

import { isCdnUploadableUrl, resolveClipboardInput } from "./clipboardResolver";

describe("isCdnUploadableUrl", () => {
  it("accepts an http(s) URL on a different host", () => {
    expect(isCdnUploadableUrl("https://example.com/photo.jpg")).toBe(true);
  });

  it("rejects a cdn.hackclub.com URL to prevent re-upload loops", () => {
    expect(isCdnUploadableUrl("https://cdn.hackclub.com/abc/def.jpg")).toBe(false);
  });

  it("rejects a non-http(s) scheme", () => {
    expect(isCdnUploadableUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects plain text that isn't a URL", () => {
    expect(isCdnUploadableUrl("just some text")).toBe(false);
  });
});

describe("resolveClipboardInput", () => {
  it("resolves a copied file with no confirmation needed", async () => {
    clipboardRead.mockResolvedValueOnce({ file: "/Users/gary/photo.png" });
    const result = await resolveClipboardInput();
    expect(result).toEqual({ type: "file", path: "/Users/gary/photo.png", needsConfirm: false });
  });

  it("resolves clipboard text that is an existing local path, needing confirmation", async () => {
    clipboardRead.mockResolvedValueOnce({ text: "/Users/gary/notes.txt" });
    existsSync.mockReturnValueOnce(true);
    const result = await resolveClipboardInput();
    expect(result).toEqual({ type: "path-text", path: "/Users/gary/notes.txt", needsConfirm: true });
  });

  it("resolves clipboard text that is a URL, needing confirmation", async () => {
    clipboardRead.mockResolvedValueOnce({ text: "https://example.com/image.jpg" });
    existsSync.mockReturnValueOnce(false);
    const result = await resolveClipboardInput();
    expect(result).toEqual({ type: "url", url: "https://example.com/image.jpg", needsConfirm: true });
  });

  it("resolves to none for plain text that's neither a path nor a URL", async () => {
    clipboardRead.mockResolvedValueOnce({ text: "just some thoughts" });
    existsSync.mockReturnValueOnce(false);
    const result = await resolveClipboardInput();
    expect(result).toEqual({ type: "none" });
  });

  it("resolves to none for an empty clipboard", async () => {
    clipboardRead.mockResolvedValueOnce({});
    const result = await resolveClipboardInput();
    expect(result).toEqual({ type: "none" });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- clipboardResolver`
Expected: FAIL — `Cannot find module './clipboardResolver'`.

- [ ] **Step 3: Implement `clipboardResolver.ts`**

Create `src/lib/clipboardResolver.ts`:

```ts
import { Clipboard } from "@raycast/api";
import { existsSync } from "fs";
import type { ClipboardResolution } from "./types";

export function isCdnUploadableUrl(text: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  return parsed.hostname !== "cdn.hackclub.com";
}

export async function resolveClipboardInput(): Promise<ClipboardResolution> {
  const content = await Clipboard.read();

  if (content.file) {
    return { type: "file", path: content.file, needsConfirm: false };
  }

  const text = content.text?.trim();
  if (!text) {
    return { type: "none" };
  }

  if (existsSync(text)) {
    return { type: "path-text", path: text, needsConfirm: true };
  }

  if (isCdnUploadableUrl(text)) {
    return { type: "url", url: text, needsConfirm: true };
  }

  return { type: "none" };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- clipboardResolver`
Expected: PASS, 9 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/clipboardResolver.ts src/lib/clipboardResolver.test.ts
git commit -m "feat: add clipboard content resolver (file, path text, url)"
```

---

## Task 5: CDN API client

**Files:**
- Create: `src/lib/cdnClient.ts`
- Test: `src/lib/cdnClient.test.ts`

**Interfaces:**
- Consumes: `UploadRecord`, `CdnApiError` from `src/lib/types.ts` (Task 2)
- Produces:
  - `uploadFile(filePath: string, token: string): Promise<UploadRecord>`
  - `uploadFromUrl(url: string, token: string): Promise<UploadRecord>`
  - `deleteUpload(id: string, token: string): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/cdnClient.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const readFileSync = vi.fn(() => Buffer.from("fake-file-bytes"));

vi.mock("fs", () => ({
  readFileSync,
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { deleteUpload, uploadFile, uploadFromUrl } from "./cdnClient";
import { CdnApiError } from "./types";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  readFileSync.mockClear();
});

describe("uploadFile", () => {
  it("uploads the file and maps the response to an UploadRecord", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "abc123",
        filename: "photo.png",
        size: 2048,
        content_type: "image/png",
        url: "https://cdn.hackclub.com/abc123/photo.png",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    const record = await uploadFile("/Users/gary/photo.png", "sk_cdn_test");

    expect(record).toEqual({
      id: "abc123",
      filename: "photo.png",
      url: "https://cdn.hackclub.com/abc123/photo.png",
      size: 2048,
      contentType: "image/png",
      createdAt: "2026-07-01T00:00:00.000Z",
      sourceType: "file",
    });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://cdn.hackclub.com/api/v4/upload");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer sk_cdn_test");
  });

  it("throws a specific error on 401", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: "invalid_auth" }));
    await expect(uploadFile("/x/y.png", "bad-token")).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<CdnApiError>);
  });

  it("surfaces quota details on 402", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(402, {
        error: "Storage quota exceeded",
        quota: { storage_used: 52428800, storage_limit: 52428800, quota_tier: "unverified", percentage_used: 100 },
      }),
    );
    await expect(uploadFile("/x/y.png", "token")).rejects.toThrow(/unverified/);
  });
});

describe("uploadFromUrl", () => {
  it("sends a JSON body and maps the response with sourceType url", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "def456",
        filename: "image.jpg",
        size: 4096,
        content_type: "image/jpeg",
        url: "https://cdn.hackclub.com/def456/image.jpg",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    const record = await uploadFromUrl("https://example.com/image.jpg", "sk_cdn_test");

    expect(record.sourceType).toBe("url");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://cdn.hackclub.com/api/v4/upload_from_url");
    expect(JSON.parse(options.body)).toEqual({ url: "https://example.com/image.jpg" });
  });
});

describe("deleteUpload", () => {
  it("resolves without throwing on a successful delete", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: "abc123", deleted: true }));
    await expect(deleteUpload("abc123", "sk_cdn_test")).resolves.toBeUndefined();
  });

  it("treats a 404 as success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: "Not found" }));
    await expect(deleteUpload("gone", "sk_cdn_test")).resolves.toBeUndefined();
  });

  it("throws on other errors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: "boom", error_id: "abc" }));
    await expect(deleteUpload("id", "sk_cdn_test")).rejects.toMatchObject({ status: 500 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- cdnClient`
Expected: FAIL — `Cannot find module './cdnClient'`.

- [ ] **Step 3: Implement `cdnClient.ts`**

Create `src/lib/cdnClient.ts`:

```ts
import { readFileSync } from "fs";
import { basename } from "path";
import { CdnApiError } from "./types";
import type { UploadRecord } from "./types";

const BASE_URL = "https://cdn.hackclub.com";

interface UploadResponseBody {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  url: string;
  created_at: string;
}

interface ErrorResponseBody {
  error?: string;
  quota?: {
    storage_used: number;
    storage_limit: number;
    quota_tier: string;
    percentage_used: number;
  };
}

function toUploadRecord(body: UploadResponseBody, sourceType: "file" | "url"): UploadRecord {
  return {
    id: body.id,
    filename: body.filename,
    url: body.url,
    size: body.size,
    contentType: body.content_type,
    createdAt: body.created_at,
    sourceType,
  };
}

async function raiseForError(response: Response): Promise<never> {
  let body: ErrorResponseBody | undefined;
  try {
    body = (await response.json()) as ErrorResponseBody;
  } catch {
    body = undefined;
  }

  if (response.status === 401) {
    throw new CdnApiError("Invalid or missing API token. Open extension preferences to set it.", 401);
  }

  if (response.status === 402 && body?.quota) {
    const { storage_used, storage_limit, quota_tier } = body.quota;
    const usedMb = Math.round(storage_used / 1024 / 1024);
    const limitMb = Math.round(storage_limit / 1024 / 1024);
    throw new CdnApiError(`Storage quota exceeded (${usedMb}MB / ${limitMb}MB used, ${quota_tier} tier).`, 402);
  }

  throw new CdnApiError(body?.error ?? `Request failed with status ${response.status}`, response.status);
}

export async function uploadFile(filePath: string, token: string): Promise<UploadRecord> {
  const fileBuffer = readFileSync(filePath);
  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer]), basename(filePath));

  const response = await fetch(`${BASE_URL}/api/v4/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    await raiseForError(response);
  }

  const body = (await response.json()) as UploadResponseBody;
  return toUploadRecord(body, "file");
}

export async function uploadFromUrl(url: string, token: string): Promise<UploadRecord> {
  const response = await fetch(`${BASE_URL}/api/v4/upload_from_url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    await raiseForError(response);
  }

  const body = (await response.json()) as UploadResponseBody;
  return toUploadRecord(body, "url");
}

export async function deleteUpload(id: string, token: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/v4/upload/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 404) {
    await raiseForError(response);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- cdnClient`
Expected: PASS, 8 tests passed.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS, all tests across all files passed (22 tests: 1 preferences + 4 uploadHistory + 9 clipboardResolver + 8 cdnClient).

- [ ] **Step 6: Commit**

```bash
git add src/lib/cdnClient.ts src/lib/cdnClient.test.ts
git commit -m "feat: add Hack Club CDN API client"
```

---

## Task 6: Extension manifest (commands + preferences)

**Files:**
- Modify: `package.json`
- Delete: `src/hack-club-cdn.ts` (empty stub from the blank template — replaced by Tasks 7-9)

**Interfaces:**
- Produces: three command slots (`upload-clipboard-file`, `upload-file`, `recent-uploads`) that Tasks 7-9 fill in, and an `apiToken` preference that `src/lib/preferences.ts` (Task 2) already reads.

- [ ] **Step 1: Delete the blank-template stub command file**

Run: `rm src/hack-club-cdn.ts`

- [ ] **Step 2: Replace the manifest's `description`, `preferences`, and `commands`**

In `package.json`, replace the `"description"` field and add `"preferences"`, and replace the
entire `"commands"` array, so the relevant parts of the file read:

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "hack-club-cdn",
  "title": "Hack Club CDN",
  "description": "Upload files to the Hack Club CDN and manage your uploads from Raycast. Requires a Hack Club account (cdn.hackclub.com) and an API token.",
  "icon": "extension-icon.png",
  "author": "garyhtou",
  "platforms": [
    "macOS"
  ],
  "categories": [
    "Productivity"
  ],
  "license": "MIT",
  "preferences": [
    {
      "name": "apiToken",
      "title": "API Token",
      "description": "Get your API token from cdn.hackclub.com/api_keys after signing in with your Hack Club account.",
      "type": "password",
      "required": true
    }
  ],
  "commands": [
    {
      "name": "upload-clipboard-file",
      "title": "Upload Clipboard File",
      "subtitle": "Hack Club CDN · Paste to Upload",
      "description": "Uploads whatever's on your clipboard (a copied file, a local path, or a link) to the Hack Club CDN and copies the resulting link.",
      "mode": "no-view",
      "keywords": [
        "clipboard",
        "paste",
        "upload",
        "cdn",
        "hack club"
      ]
    },
    {
      "name": "upload-file",
      "title": "Upload File",
      "subtitle": "Hack Club CDN · Browse & Upload",
      "description": "Pick a file from disk or paste its path to upload it to the Hack Club CDN.",
      "mode": "view",
      "keywords": [
        "browse",
        "file picker",
        "upload",
        "cdn",
        "hack club"
      ]
    },
    {
      "name": "recent-uploads",
      "title": "Recent Uploads",
      "subtitle": "Hack Club CDN",
      "description": "Browse, copy links from, and delete files you've uploaded from this Mac.",
      "mode": "view",
      "keywords": [
        "history",
        "cdn",
        "hack club"
      ]
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.104.20",
    "@raycast/utils": "^1.17.0"
  }
}
```

(Keep the existing `"devDependencies"` and `"scripts"` sections from the current file
untouched — only `description`, `preferences`, `commands`, `platforms`, and `categories`
change; `dependencies` stays as-is.)

- [ ] **Step 3: Verify the manifest is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" && echo "valid JSON"`
Expected: `valid JSON`

- [ ] **Step 4: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS, all 22 tests still passing (manifest changes don't touch `src/lib`).

- [ ] **Step 5: Commit**

```bash
git add package.json
git rm src/hack-club-cdn.ts
git commit -m "feat: define upload-clipboard-file, upload-file, and recent-uploads commands"
```

---

## Task 7: "Upload Clipboard File" command

**Files:**
- Create: `src/upload-clipboard-file.ts`

**Interfaces:**
- Consumes: `getApiToken()` (Task 2), `resolveClipboardInput()` (Task 4), `uploadFile()`/`uploadFromUrl()`/`CdnApiError` (Tasks 2 & 5), `addUpload()` (Task 3)

- [ ] **Step 1: Implement the command**

Create `src/upload-clipboard-file.ts`:

```ts
import { basename } from "path";
import {
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { uploadFile, uploadFromUrl } from "./lib/cdnClient";
import { resolveClipboardInput } from "./lib/clipboardResolver";
import { addUpload } from "./lib/uploadHistory";
import { getApiToken } from "./lib/preferences";
import { CdnApiError } from "./lib/types";

export default async function Command() {
  const token = getApiToken();
  if (!token) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No API token configured",
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return;
  }

  const resolution = await resolveClipboardInput();

  if (resolution.type === "none") {
    await showHUD("Clipboard doesn't contain a file, path, or link");
    return;
  }

  if (resolution.needsConfirm) {
    const confirmTitle =
      resolution.type === "path-text" ? `Upload "${basename(resolution.path)}"?` : "Upload this link?";
    const confirmMessage = resolution.type === "path-text" ? resolution.path : resolution.url;
    const confirmed = await confirmAlert({
      title: confirmTitle,
      message: confirmMessage,
      primaryAction: { title: "Upload", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) {
      return;
    }
  }

  try {
    const record =
      resolution.type === "url" ? await uploadFromUrl(resolution.url, token) : await uploadFile(resolution.path, token);

    await addUpload(record);
    await Clipboard.copy(record.url);
    await closeMainWindow();
    await showHUD("Copied CDN link! Undo anytime in Recent Uploads");
  } catch (error) {
    const message = error instanceof CdnApiError ? error.message : "Upload failed";
    await showHUD(message);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification via `ray develop`**

Run: `npm run dev`

With the dev server running, in Raycast:
1. Set the `apiToken` preference to a real token (from `cdn.hackclub.com/api_keys`), then clear it temporarily and run "Upload Clipboard File" — confirm you see the "No API token configured" toast with a working "Open Extension Preferences" action. Restore the real token afterward.
2. Copy an image file in Finder (⌘C), run "Upload Clipboard File" — confirm it uploads instantly with **no confirmation dialog**, the window closes, and you see the "Copied CDN link!" HUD; paste the clipboard somewhere to confirm it's a working `cdn.hackclub.com` URL.
3. Copy a local file's absolute path as text (e.g. via a text editor, not a Finder file-copy), run the command — confirm a `confirmAlert` dialog appears asking to upload that filename, and that both confirming and canceling behave correctly.
4. Copy a plain `https://` URL (not a `cdn.hackclub.com` one) as text, run the command — confirm the same confirm-dialog behavior, then a successful `upload_from_url` call.
5. Copy a `https://cdn.hackclub.com/...` URL as text, run the command — confirm it reports "doesn't contain a file, path, or link" rather than re-uploading it.
6. Copy unrelated plain text, run the command — confirm the same "doesn't contain..." message.

Expected: all six behaviors match what's described above.

- [ ] **Step 5: Commit**

```bash
git add src/upload-clipboard-file.ts
git commit -m "feat: add Upload Clipboard File command"
```

---

## Task 8: "Upload File" command

**Files:**
- Create: `src/upload-file.tsx`

**Interfaces:**
- Consumes: `getApiToken()` (Task 2), `uploadFile()`/`deleteUpload()`/`CdnApiError` (Tasks 2 & 5), `addUpload()`/`removeUpload()` (Task 3)

- [ ] **Step 1: Implement the command**

Create `src/upload-file.tsx`:

```tsx
import { useState } from "react";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { deleteUpload, uploadFile } from "./lib/cdnClient";
import { addUpload, removeUpload } from "./lib/uploadHistory";
import { getApiToken } from "./lib/preferences";
import { CdnApiError } from "./lib/types";

export default function Command() {
  const [pathText, setPathText] = useState("");
  const [files, setFiles] = useState<string[]>([]);

  async function handleSubmit() {
    const token = getApiToken();
    const filePath = files[0] ?? pathText.trim();

    if (!filePath) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a file or enter a path" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading…" });

    try {
      const record = await uploadFile(filePath, token);
      await addUpload(record);
      await Clipboard.copy(record.url);

      toast.style = Toast.Style.Success;
      toast.title = "Uploaded! Link copied";
      toast.primaryAction = {
        title: "Undo (Delete from CDN)",
        onAction: async (activeToast) => {
          await deleteUpload(record.id, token);
          await removeUpload(record.id);
          activeToast.style = Toast.Style.Success;
          activeToast.title = "Upload undone";
          activeToast.primaryAction = undefined;
        },
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = error instanceof CdnApiError ? error.message : "Upload failed";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="filePicker"
        title="File"
        value={files}
        onChange={setFiles}
        allowMultipleSelection={false}
      />
      <Form.TextField
        id="pathText"
        title="Or Paste a Path"
        value={pathText}
        onChange={setPathText}
        placeholder="/Users/you/file.png"
      />
    </Form>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification via `ray develop`**

With `npm run dev` running:
1. Run "Upload File", submit with neither field filled — confirm the "Choose a file or enter a path" failure toast.
2. Use the file picker to choose a file, submit — confirm an animated "Uploading…" toast, then a success toast with an "Undo (Delete from CDN)" action; paste the clipboard to confirm the link is on it.
3. Click the toast's "Undo" action — confirm the toast updates to "Upload undone" and the file is gone from `cdn.hackclub.com` when you visit the link.
4. Paste a valid local file path into the text field (no file picker selection) and submit — confirm it uploads that file instead.

Expected: all four behaviors match what's described above.

- [ ] **Step 5: Commit**

```bash
git add src/upload-file.tsx
git commit -m "feat: add Upload File command"
```

---

## Task 9: "Recent Uploads" command

**Files:**
- Create: `src/recent-uploads.tsx`

**Interfaces:**
- Consumes: `getUploads()`/`removeUpload()` (Task 3), `deleteUpload()` (Task 5), `getApiToken()` (Task 2), `UploadRecord` (Task 2)

- [ ] **Step 1: Implement the command**

Create `src/recent-uploads.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Action, ActionPanel, Alert, confirmAlert, List } from "@raycast/api";
import { deleteUpload } from "./lib/cdnClient";
import { getUploads, removeUpload } from "./lib/uploadHistory";
import { getApiToken } from "./lib/preferences";
import type { UploadRecord } from "./lib/types";

export default function Command() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    setUploads(await getUploads());
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDeleteFromCdn(record: UploadRecord) {
    const confirmed = await confirmAlert({
      title: `Delete "${record.filename}" from the CDN?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    await deleteUpload(record.id, getApiToken());
    await removeUpload(record.id);
    await refresh();
  }

  async function handleRemoveFromHistory(record: UploadRecord) {
    await removeUpload(record.id);
    await refresh();
  }

  return (
    <List isLoading={isLoading} navigationTitle="Recent Uploads (this Mac)">
      <List.EmptyView title="No uploads yet" description="Uploads made from this Mac will show up here" />
      {uploads.map((record) => (
        <List.Item
          key={record.id}
          title={record.filename}
          subtitle={`${Math.round(record.size / 1024)} KB`}
          accessories={[{ date: new Date(record.createdAt) }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Link" content={record.url} />
              <Action.OpenInBrowser title="Open in Browser" url={record.url} />
              <Action title="Delete from CDN" onAction={() => handleDeleteFromCdn(record)} />
              <Action title="Remove from History" onAction={() => handleRemoveFromHistory(record)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification via `ray develop`**

With `npm run dev` running, and after having made a couple of uploads via the other two commands:
1. Run "Recent Uploads" — confirm the list shows your uploads newest-first, with the navigation title reading "Recent Uploads (this Mac)".
2. Use "Copy Link" and "Open in Browser" on an item — confirm both work.
3. Use "Delete from CDN" on an item — confirm a destructive confirm dialog appears, and on confirming, the item disappears from the list and the link now 404s when visited.
4. Use "Remove from History" on another item — confirm it disappears from the list but is still reachable at its CDN URL (only removed locally).
5. Remove all items (or run this on a fresh install) — confirm the empty view appears with the "Uploads made from this Mac will show up here" copy.

Expected: all five behaviors match what's described above.

- [ ] **Step 5: Commit**

```bash
git add src/recent-uploads.tsx
git commit -m "feat: add Recent Uploads command"
```

---

## Task 10: Store-publish readiness

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- None (documentation-only; no code interfaces produced or consumed).

- [ ] **Step 1: Write the README**

Replace the contents of `README.md`:

```markdown
# Hack Club CDN

Upload files to the [Hack Club CDN](https://cdn.hackclub.com) and manage your uploads,
right from Raycast.

**Requires a Hack Club account.** This extension talks to the Hack Club CDN's API, which is
gated behind "Sign in with Hack Club." If you don't have a Hack Club account, this extension
won't be usable for you.

## Setup

1. Go to [cdn.hackclub.com](https://cdn.hackclub.com) and sign in with your Hack Club account.
2. Visit [cdn.hackclub.com/api_keys](https://cdn.hackclub.com/api_keys) and create a new API key. Copy it — it's only shown once.
3. In Raycast, open this extension's preferences and paste the key into **API Token**.

## Commands

- **Upload Clipboard File** — the fast path. Copy a file in Finder (or copy a local file
  path, or a link), then run this command. It uploads whatever's on your clipboard and
  copies the resulting CDN link back to your clipboard. We recommend binding this to a
  global hotkey (Raycast Preferences → Extensions → Hack Club CDN → Upload Clipboard File)
  for the fastest workflow.
- **Upload File** — pick a file from disk, or paste in a path, via a form. Slower but more
  deliberate; includes an inline "Undo" action right after uploading.
- **Recent Uploads** — browse, copy links from, and delete files you've uploaded from this
  Mac. This list is stored locally and only reflects uploads made through this extension —
  it can't show uploads made via the CDN website or elsewhere.

## Made a mistake?

If "Upload Clipboard File" uploads the wrong thing, open **Recent Uploads** — your latest
upload is always at the top — and use **Delete from CDN** to remove it.
```

- [ ] **Step 2: Update the CHANGELOG**

Replace the contents of `CHANGELOG.md`:

```markdown
# Hack Club CDN Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Upload Clipboard File: upload a copied file, path, or link straight from your clipboard.
- Upload File: pick a file from disk or paste a path, with an inline undo.
- Recent Uploads: browse, copy links from, and delete your uploads.
```

- [ ] **Step 3: Run the full verification pass**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all three pass with no errors.

- [ ] **Step 4: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: write README and CHANGELOG for store submission"
```

---

## Out of scope (deferred, not part of this plan)

- Windows support
- Multi-file / batch upload
- In-extension OAuth or account creation
- A menu-bar command
- Pre-upload quota/size checking against `/api/v4/me`
- Actually submitting to the Raycast Store (`npm run publish`) — do this once the extension has been used for real for a few days and the icon/screenshots are ready.
