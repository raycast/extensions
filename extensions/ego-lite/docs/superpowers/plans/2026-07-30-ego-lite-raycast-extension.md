# Ego Lite Raycast Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first, Store-compatible Raycast extension with exactly three Ego Lite commands: New Tab, Search Bookmarks, and Search History.

**Architecture:** A small Ego Lite adapter owns application discovery and LaunchServices URL routing, while pure TypeScript modules resolve Chromium profiles, flatten bookmark JSON, and generate safe history SQL. Raycast command components consume those modules and render native lists; all browser data remains local and AI Task Spaces are outside the integration boundary.

**Tech Stack:** Raycast API 1.104, Raycast Utils 2.2, React 19, TypeScript 5.9, ESLint 9, Node test runner through `tsx`, macOS LaunchServices, Chromium bookmark JSON, Chromium History SQLite.

## Global Constraints

- The extension is macOS-only.
- The manifest exposes exactly `new-tab`, `search-bookmarks`, and `search-history`.
- The Ego Lite bundle identifier is `com.citrolabs.ego.lite`.
- Browser data root is `~/Library/Application Support/Citro Labs/ego lite`.
- Do not invoke `ego-browser` or enumerate, claim, switch, or interrupt AI Task Spaces.
- Do not modify `Local State`, bookmark files, History, or any other browser data.
- Do not send bookmarks, history URLs, hostnames, or search queries to a remote favicon or search service.
- Use locally generated domain icons with a generic-link fallback; do not use `getFavicon(url)`.
- Empty bookmark search shows all bookmarks; empty history search shows the 100 most recent unique HTTP or HTTPS URLs.
- Opening a bookmark or history entry creates a new tab in a visible normal user window.
- Local use is the first delivery; project structure, metadata, documentation, lint, and build must remain suitable for later Raycast Store submission.

## Planned File Structure

- `package.json` — Raycast manifest, dependency versions, and build/lint/test scripts.
- `tsconfig.json` — strict Raycast TypeScript configuration.
- `eslint.config.js` — Raycast ESLint flat configuration.
- `.prettierrc` — formatting rules.
- `.gitignore` — generated and dependency exclusions.
- `assets/extension-icon.png` — Ego Lite-derived extension icon.
- `src/constants.ts` — application identity, paths, URLs, and result limits.
- `src/lib/profile.ts` — pure profile selection and filesystem path resolution.
- `src/lib/bookmarks.ts` — bookmark parsing, fallback loading, flattening, and search.
- `src/lib/history.ts` — safe Chromium history SQL generation and result model.
- `src/lib/presentation.ts` — URL display, locally generated domain icons, and copy formats.
- `src/lib/browser-safety.ts` — pure HTTP and HTTPS URL validation.
- `src/lib/ego-lite.ts` — app detection and LaunchServices routing.
- `src/components/browser-item.tsx` — shared bookmark/history list item and actions.
- `src/new-tab.ts` — no-view New Tab command.
- `src/search-bookmarks.tsx` — bookmark list command.
- `src/search-history.tsx` — history list command and permission flow.
- `tests/profile.test.ts` — profile selection/path tests.
- `tests/bookmarks.test.ts` — bookmark parsing/fallback/search tests.
- `tests/history.test.ts` — SQL generation/escaping tests.
- `tests/presentation.test.ts` — URL and copy-format tests.
- `README.md` — installation, usage, permissions, privacy, troubleshooting.
- `LICENSE` — MIT license text.

---

### Task 1: Scaffold the Raycast extension and profile resolver

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `.gitignore`
- Create: `src/constants.ts`
- Create: `src/lib/profile.ts`
- Create: `tests/profile.test.ts`

**Interfaces:**
- Produces: `selectProfileDirectory(state: unknown): string`
- Produces: `profilePath(profileDirectory: string, fileName: ChromiumProfileFile): string`
- Produces: `activeProfilePath(fileName: ChromiumProfileFile): Promise<string>`

- [ ] **Step 1: Add the Raycast manifest and tooling configuration**

Create a manifest with exactly these command entries:

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "ego-lite",
  "title": "Ego Lite",
  "description": "Create tabs and search local bookmarks and history in Ego Lite.",
  "icon": "extension-icon.png",
  "author": "luobin",
  "platforms": ["macOS"],
  "categories": ["Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "new-tab",
      "title": "New Tab",
      "subtitle": "Ego Lite",
      "description": "Create a new blank Ego Lite tab.",
      "mode": "no-view"
    },
    {
      "name": "search-bookmarks",
      "title": "Search Bookmarks",
      "subtitle": "Ego Lite",
      "description": "Search local Ego Lite bookmarks.",
      "mode": "view"
    },
    {
      "name": "search-history",
      "title": "Search History",
      "subtitle": "Ego Lite",
      "description": "Search local Ego Lite browsing history.",
      "mode": "view"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.104.1",
    "@raycast/utils": "^2.2.4"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.1.1",
    "@types/node": "24.10.1",
    "@types/react": "19.2.5",
    "eslint": "^9.39.1",
    "prettier": "^3.6.2",
    "react": "^19.2.0",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "lint": "ray lint",
    "fix-lint": "ray lint --fix",
    "test": "tsx --test tests/*.test.ts"
  }
}
```

Use strict ES2023/CommonJS Raycast TypeScript settings, Raycast's flat ESLint config, a two-space Prettier configuration, and ignore `node_modules`, `dist`, `.DS_Store`, and Raycast generated type files.

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and installation finishes without dependency resolution errors.

- [ ] **Step 3: Write failing profile resolver tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { profilePath, selectProfileDirectory } from "../src/lib/profile";

test("uses last_used when present", () => {
  assert.equal(selectProfileDirectory({ profile: { last_used: "Profile 2", info_cache: { Default: {} } } }), "Profile 2");
});

test("falls back to the first info_cache profile", () => {
  assert.equal(selectProfileDirectory({ profile: { last_used: "", info_cache: { "Profile 1": {}, Default: {} } } }), "Profile 1");
});

test("falls back to Default for malformed state", () => {
  assert.equal(selectProfileDirectory(null), "Default");
});

test("builds a path below the Ego Lite profile root", () => {
  assert.match(profilePath("Default", "History"), /Citro Labs\/ego lite\/Default\/History$/);
});
```

- [ ] **Step 4: Run tests and verify the expected failure**

Run: `npm test`

Expected: FAIL because `src/lib/profile.ts` does not exist.

- [ ] **Step 5: Implement constants and profile resolution**

```ts
// src/constants.ts
import { homedir } from "node:os";
import { join } from "node:path";

export const EGO_LITE_BUNDLE_ID = "com.citrolabs.ego.lite";
export const EGO_LITE_WEBSITE = "https://lite.ego.app/";
export const EGO_LITE_DATA_ROOT = join(homedir(), "Library", "Application Support", "Citro Labs", "ego lite");
export const LOCAL_STATE_PATH = join(EGO_LITE_DATA_ROOT, "Local State");
export const HISTORY_RESULT_LIMIT = 100;
```

```ts
// src/lib/profile.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { EGO_LITE_DATA_ROOT, LOCAL_STATE_PATH } from "../constants";

export type ChromiumProfileFile = "AccountBookmarks" | "Bookmarks" | "Favicons" | "History";

export function selectProfileDirectory(state: unknown): string {
  if (!state || typeof state !== "object") return "Default";
  const profile = (state as { profile?: unknown }).profile;
  if (!profile || typeof profile !== "object") return "Default";
  const record = profile as { last_used?: unknown; info_cache?: unknown };
  if (typeof record.last_used === "string" && record.last_used.trim()) return record.last_used;
  if (record.info_cache && typeof record.info_cache === "object") {
    return Object.keys(record.info_cache)[0] ?? "Default";
  }
  return "Default";
}

export function profilePath(profileDirectory: string, fileName: ChromiumProfileFile): string {
  return join(EGO_LITE_DATA_ROOT, profileDirectory, fileName);
}

export async function activeProfilePath(fileName: ChromiumProfileFile): Promise<string> {
  try {
    const state = JSON.parse(await readFile(LOCAL_STATE_PATH, "utf8")) as unknown;
    return profilePath(selectProfileDirectory(state), fileName);
  } catch {
    return profilePath("Default", fileName);
  }
}
```

- [ ] **Step 6: Run profile tests**

Run: `npm test`

Expected: all profile tests PASS.

- [ ] **Step 7: Commit the scaffold and profile resolver**

```bash
git add package.json package-lock.json tsconfig.json eslint.config.js .prettierrc .gitignore src/constants.ts src/lib/profile.ts tests/profile.test.ts
git commit -m "chore: scaffold Ego Lite Raycast extension"
```

---

### Task 2: Implement bookmark loading, fallback, flattening, and search

**Files:**
- Create: `src/lib/bookmarks.ts`
- Create: `tests/bookmarks.test.ts`

**Interfaces:**
- Consumes: `activeProfilePath(fileName)` from Task 1.
- Produces: `BookmarkItem` with `id`, `title`, `url`, `path`, and optional `dateAdded`.
- Produces: `flattenBookmarks(raw: unknown): BookmarkItem[]`
- Produces: `filterBookmarks(items: BookmarkItem[], query: string): BookmarkItem[]`
- Produces: `loadBookmarks(paths?: BookmarkPaths): Promise<BookmarkItem[]>`

- [ ] **Step 1: Write failing bookmark tests**

```ts
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { filterBookmarks, flattenBookmarks, loadBookmarks } from "../src/lib/bookmarks";

const raw = {
  roots: {
    bookmark_bar: {
      type: "folder",
      name: "Bookmarks Bar",
      children: [
        { type: "folder", name: "Work", children: [{ type: "url", id: "7", name: "Raycast", url: "https://raycast.com" }] }
      ]
    }
  }
};

test("flattens nested bookmarks with folder paths", () => {
  assert.deepEqual(flattenBookmarks(raw), [{ id: "7", title: "Raycast", url: "https://raycast.com", path: "Bookmarks Bar › Work" }]);
});

test("matches title, URL, and path case-insensitively", () => {
  const items = flattenBookmarks(raw);
  assert.equal(filterBookmarks(items, "RAYCAST").length, 1);
  assert.equal(filterBookmarks(items, "raycast.com").length, 1);
  assert.equal(filterBookmarks(items, "work").length, 1);
});

test("falls back to Bookmarks when AccountBookmarks has no URL entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ego-bookmarks-"));
  const account = join(dir, "AccountBookmarks");
  const legacy = join(dir, "Bookmarks");
  await writeFile(account, JSON.stringify({ roots: {} }));
  await writeFile(legacy, JSON.stringify(raw));
  assert.equal((await loadBookmarks({ account, legacy })).length, 1);
});
```

- [ ] **Step 2: Run the bookmark tests and verify failure**

Run: `npm test`

Expected: FAIL because `src/lib/bookmarks.ts` does not exist.

- [ ] **Step 3: Implement bookmark parsing and fallback**

Use a recursive visitor that accepts unknown JSON, descends only through nodes with `type: "folder"` and an array `children`, emits only nodes with `type: "url"` and a non-empty URL, and joins folder names with ` › `. Load `AccountBookmarks` first; return it only when at least one URL was parsed, then fall back to `Bookmarks`. Missing or malformed files return the next fallback and ultimately an empty array.

```ts
export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  path: string;
  dateAdded?: string;
}

export interface BookmarkPaths {
  account: string;
  legacy: string;
}

export function filterBookmarks(items: BookmarkItem[], query: string): BookmarkItem[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return items;
  return items.filter((item) => `${item.title}\n${item.url}\n${item.path}`.toLocaleLowerCase().includes(needle));
}
```

- [ ] **Step 4: Run bookmark tests**

Run: `npm test`

Expected: profile and bookmark tests PASS.

- [ ] **Step 5: Commit bookmark data support**

```bash
git add src/lib/bookmarks.ts tests/bookmarks.test.ts
git commit -m "feat: add local Ego Lite bookmark search"
```

---

### Task 3: Implement safe History SQL generation

**Files:**
- Create: `src/lib/history.ts`
- Create: `tests/history.test.ts`

**Interfaces:**
- Consumes: `HISTORY_RESULT_LIMIT` from Task 1.
- Produces: `HistoryItem` with `id`, `url`, `title`, and `lastVisitedAt`.
- Produces: `escapeSqlLike(value: string): string`
- Produces: `buildHistoryQuery(searchText: string, limit?: number): string`

- [ ] **Step 1: Write failing History SQL tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildHistoryQuery, escapeSqlLike } from "../src/lib/history";

test("escapes quotes and LIKE metacharacters", () => {
  assert.equal(escapeSqlLike("50%_off\\it's"), "50\\%\\_off\\\\it''s");
});

test("does not filter zero or one character queries", () => {
  const sql = buildHistoryQuery("a");
  assert.doesNotMatch(sql, /title LIKE/);
  assert.doesNotMatch(sql, /url LIKE '%a%'/);
});

test("requires every multi-word term to match title or URL", () => {
  const sql = buildHistoryQuery("ray cast");
  assert.match(sql, /title LIKE '%ray%'/);
  assert.match(sql, /title LIKE '%cast%'/);
  assert.match(sql, /\) AND \(/);
});

test("limits empty search to 100 recent URLs", () => {
  const sql = buildHistoryQuery("");
  assert.match(sql, /url LIKE 'http:\/\/%'/);
  assert.match(sql, /url LIKE 'https:\/\/%'/);
  assert.match(sql, /GROUP BY url/);
  assert.match(sql, /ORDER BY last_visit_time DESC/);
  assert.match(sql, /LIMIT 100/);
});
```

- [ ] **Step 2: Run tests and verify the History module failure**

Run: `npm test`

Expected: FAIL because `src/lib/history.ts` does not exist.

- [ ] **Step 3: Implement safe query generation**

```ts
import { HISTORY_RESULT_LIMIT } from "../constants";

export interface HistoryItem {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: string;
}

export function escapeSqlLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/'/g, "''");
}

export function buildHistoryQuery(searchText: string, limit = HISTORY_RESULT_LIMIT): string {
  const normalized = searchText.trim();
  const terms = normalized.length >= 2 ? normalized.split(/\s+/).filter(Boolean) : [];
  const filter = terms.length
    ? `AND ${terms.map((term) => {
        const value = escapeSqlLike(term);
        return `(title LIKE '%${value}%' ESCAPE '\\' OR url LIKE '%${value}%' ESCAPE '\\')`;
      }).join(" AND ")}`
    : "";
  return `SELECT id, url, COALESCE(NULLIF(title, ''), url) AS title,
    datetime(last_visit_time / 1000000 + strftime('%s', '1601-01-01'), 'unixepoch', 'localtime') AS lastVisitedAt
    FROM urls WHERE last_visit_time > 0
      AND (url LIKE 'http://%' OR url LIKE 'https://%') ${filter}
    GROUP BY url ORDER BY last_visit_time DESC LIMIT ${Math.max(1, Math.trunc(limit))};`;
}
```

- [ ] **Step 4: Run History tests**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit History query support**

```bash
git add src/lib/history.ts tests/history.test.ts
git commit -m "feat: add safe Ego Lite history queries"
```

---

### Task 4: Implement the Ego Lite LaunchServices adapter

**Files:**
- Create: `src/lib/browser-safety.ts`
- Create: `src/lib/ego-lite.ts`
- Create: `tests/ego-lite.test.ts`

**Interfaces:**
- Consumes: application identity constants from Task 1.
- Produces: `ensureEgoLiteInstalled(): Promise<void>`
- Produces: `createBlankTab(): Promise<void>`
- Produces: `openUrlInNewTab(url: string): Promise<void>`
- Consumes: `normalizeWebUrl(value)` from `src/lib/browser-safety.ts`.
- Produces from `browser-safety.ts`: `normalizeWebUrl(value: string): string`
- Produces: `EgoLiteNotInstalledError`.

- [ ] **Step 1: Write failing adapter-boundary tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWebUrl } from "../src/lib/browser-safety";

test("accepts only HTTP and HTTPS URLs", () => {
  assert.equal(normalizeWebUrl("https://raycast.com"), "https://raycast.com/");
  assert.throws(() => normalizeWebUrl("javascript:alert(1)"), /HTTP or HTTPS/);
});
```

- [ ] **Step 2: Run tests and verify the adapter module failure**

Run: `npm test`

Expected: FAIL because `src/lib/ego-lite.ts` does not exist.

- [ ] **Step 3: Implement installation detection**

Use `getApplications()` from `@raycast/api`, match `bundleId === EGO_LITE_BUNDLE_ID`, and throw `EgoLiteNotInstalledError` with the message `Ego Lite is not installed.` when missing.

```ts
export class EgoLiteNotInstalledError extends Error {
  constructor() {
    super("Ego Lite is not installed.");
    this.name = "EgoLiteNotInstalledError";
  }
}
```

- [ ] **Step 4: Implement the pure URL validator**

```ts
export function normalizeWebUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP or HTTPS URLs can be opened in Ego Lite.");
  }
  return url.toString();
}
```

Reject non-HTTP schemes before routing the URL to the application.

- [ ] **Step 5: Implement blank-tab behavior**

After installation detection, call Raycast `open("ego://newtab", EGO_LITE_BUNDLE_ID)`. Live verification must show that Ego Lite activates and creates one selected blank normal user tab.

- [ ] **Step 6: Implement open-URL behavior**

After installation detection and `normalizeWebUrl`, call Raycast `open(url, EGO_LITE_BUNDLE_ID)`. Live verification must show that an HTTP URL opens in a new normal user tab.

- [ ] **Step 7: Run adapter tests**

Run: `npm test`

Expected: all profile, bookmark, History, and adapter-boundary tests PASS.

- [ ] **Step 8: Commit the adapter**

```bash
git add src/lib/browser-safety.ts src/lib/ego-lite.ts tests/ego-lite.test.ts
git commit -m "feat: add Ego Lite LaunchServices adapter"
```

---

### Task 5: Build the shared UI and three commands

**Files:**
- Create: `src/lib/presentation.ts`
- Create: `tests/presentation.test.ts`
- Create: `src/components/browser-item.tsx`
- Create: `src/new-tab.ts`
- Create: `src/search-bookmarks.tsx`
- Create: `src/search-history.tsx`

**Interfaces:**
- Consumes: all Task 1-4 functions and models.
- Produces: the three manifest entry points.
- Produces: `displayHost(url: string): string`
- Produces: `markdownLink(title: string, url: string): string`

- [ ] **Step 1: Write failing presentation tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { displayHost, markdownLink } from "../src/lib/presentation";

test("removes www from display hosts", () => {
  assert.equal(displayHost("https://www.raycast.com/store"), "raycast.com");
});

test("falls back to the original string for invalid URLs", () => {
  assert.equal(displayHost("not a URL"), "not a URL");
});

test("formats Markdown links", () => {
  assert.equal(markdownLink("Raycast", "https://raycast.com"), "[Raycast](https://raycast.com)");
});
```

- [ ] **Step 2: Run tests and verify the presentation module failure**

Run: `npm test`

Expected: FAIL because `src/lib/presentation.ts` does not exist.

- [ ] **Step 3: Implement privacy-safe presentation helpers**

Implement `displayHost` and `markdownLink` as pure functions with no Raycast imports so Node tests can load the module directly.

- [ ] **Step 4: Implement the shared browser item**

`BrowserItem` accepts `title`, `url`, optional `path`, optional `lastVisitedAt`, and `onOpen`. It renders a `List.Item` with title, hostname subtitle, and path or relative-date accessories. Inside this component, use Raycast Utils `getAvatarIcon(displayHost(url))` for a locally generated domain icon and `{ source: Icon.Link }` for invalid URLs. Do not use `getFavicon` because its provider may resolve icons remotely. Its `ActionPanel` contains:

1. `Open in Ego Lite` calling `onOpen`.
2. `Copy URL` with `Keyboard.Shortcut.Common.Copy`.
3. `Copy Title` with `Keyboard.Shortcut.Common.CopyName`.
4. `Copy as Markdown` using `markdownLink`.

Opening successfully closes the Raycast window; failures use `showFailureToast` with a command-specific title.

- [ ] **Step 5: Implement the no-view New Tab command**

```ts
export default async function Command() {
  try {
    await closeMainWindow();
    await createBlankTab();
  } catch (error) {
    await showFailureToast(error, { title: "Could not create an Ego Lite tab" });
  }
}
```

- [ ] **Step 6: Implement Search Bookmarks**

Use `usePromise(loadBookmarks, [])`, local React search state, and `filterBookmarks`. Return a `List` with placeholder `Search bookmarks...`; show a friendly `List.EmptyView` for no bookmark data and a separate no-results state for a non-empty query. Each result uses `BrowserItem` and `openUrlInNewTab`.

- [ ] **Step 7: Implement Search History**

Resolve the active History path asynchronously, debounce search text by 200 ms, and call `useSQL<HistoryItem>` with `buildHistoryQuery(debouncedSearch)`. Pass permission priming text `Full Disk Access is required only to search your local Ego Lite browsing history.` Return `permissionView` when present. On transient SQL failure, schedule at most one revalidation after one second. Render `BrowserItem` results and an error/empty state as appropriate.

- [ ] **Step 8: Run all tests**

Run: `npm test`

Expected: profile, bookmark, History, and presentation tests PASS.

- [ ] **Step 9: Run lint and production build**

Run: `npm run lint && npm run build`

Expected: both commands exit 0.

- [ ] **Step 10: Commit the three command implementations**

```bash
git add src tests
git commit -m "feat: add Ego Lite Raycast commands"
```

---

### Task 6: Add assets, documentation, and complete local acceptance

**Files:**
- Create: `assets/extension-icon.png`
- Create: `README.md`
- Create: `LICENSE`
- Modify: `docs/superpowers/specs/2026-07-30-ego-lite-raycast-extension-design.md`

**Interfaces:**
- Consumes: the complete extension from Tasks 1-5.
- Produces: a locally importable, documented, verified Raycast extension.

- [ ] **Step 1: Create the extension icon from the installed Ego Lite asset**

Convert `/Applications/ego lite.app/Contents/Resources/app.icns` to a 512×512 PNG using macOS `sips`, save it as `assets/extension-icon.png`, and verify with `sips -g pixelWidth -g pixelHeight assets/extension-icon.png`.

Expected: both dimensions are 512.

- [ ] **Step 2: Write README and privacy documentation**

Document:

- The three commands and their exact behaviors.
- Node 22.14+, npm 7+, Raycast, and Ego Lite requirements.
- `npm install && npm run dev` local import flow.
- LaunchServices routing through the Ego Lite bundle identifier and `ego://newtab`.
- Full Disk Access for local History search.
- Local data paths and read-only behavior.
- The no-network privacy guarantee for bookmarks, history, queries, and domain icons.
- Troubleshooting for missing app, empty bookmarks, denied permissions, and unavailable History.
- Explicit exclusion of AI Task Spaces.

- [ ] **Step 3: Add the MIT license**

Use the standard MIT license with copyright year 2026 and holder `luobin`.

- [ ] **Step 4: Update the design's favicon wording**

Replace the approved document's generic `favicon` wording with `locally generated domain icon` and record that remote favicon providers are intentionally excluded to preserve the privacy requirement.

- [ ] **Step 5: Run the complete automated verification**

Run: `npm test && npm run lint && npm run build && git diff --check`

Expected: every command exits 0.

- [ ] **Step 6: Start Raycast development mode**

Run: `npm run dev`

Expected: Raycast imports the extension and exposes `New Tab`, `Search Bookmarks`, and `Search History` under Ego Lite.

- [ ] **Step 7: Perform read-only and user-window smoke tests**

Verify:

1. `New Tab` adds one blank tab to the current visible normal window.
2. Search Bookmarks shows local items or the correct empty state and opens a selected URL in a new tab.
3. Search History shows the permission view when required, then recent and filtered local results, and opens a selected URL in a new tab.
4. Copy URL, Copy Title, and Copy as Markdown return correct content.
5. Ego Lite AI Task Spaces are neither selected nor changed.

- [ ] **Step 8: Commit documentation and final verification state**

```bash
git add assets README.md LICENSE docs/superpowers/specs/2026-07-30-ego-lite-raycast-extension-design.md
git commit -m "docs: add Ego Lite extension setup and privacy guide"
```

- [ ] **Step 9: Record final repository evidence**

Run: `git status --short --branch && git log --oneline --decorate -8`

Expected: clean `main` branch with the design, implementation, and documentation commits visible.
