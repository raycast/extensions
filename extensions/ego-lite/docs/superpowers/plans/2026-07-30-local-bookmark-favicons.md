# Local Bookmark Favicons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display real website favicons from Ego Lite's local Chromium favicon cache in Search Bookmarks, with the existing local domain avatar as a non-blocking fallback.

**Architecture:** A focused favicon repository opens the active profile's `Favicons` SQLite database through a read-only immutable URI, converts valid PNG rows to Raycast data-URI image sources, and builds exact-URL and origin indexes. Search Bookmarks loads this optional index beside bookmarks and passes matched icons to the shared result component; missing or invalid favicon data never blocks bookmark search.

**Tech Stack:** Raycast API 1.104, Raycast Utils 2.2, React 19, TypeScript 5.9, Node `node:sqlite`, Chromium `Favicons` SQLite schema, Node test runner through `tsx`.

## Global Constraints

- Change only Search Bookmarks favicon presentation; Search History and New Tab behavior remain unchanged.
- Read the active Ego Lite profile's `Favicons` database through a read-only `file:` URI with `immutable=1`.
- Do not write, repair, copy, migrate, or persistently cache the favicon database or its images.
- Do not make network requests or use a remote favicon provider.
- Prefer the largest valid PNG and then the newest record when dimensions are equal.
- Match an exact normalized page URL before falling back to the normalized origin, including scheme and non-default port.
- Missing, locked, inaccessible, malformed, or incomplete favicon data must silently fall back to the existing local domain avatar.

## File Structure

- `src/lib/favicons.ts` — immutable database loading, query, PNG conversion, ranking, indexing, and lookup.
- `tests/favicons.test.ts` — pure matching/ranking tests plus a temporary Chromium-schema database read test.
- `src/components/browser-item.tsx` — accepts an optional caller-provided icon and preserves the existing fallback.
- `src/search-bookmarks.tsx` — loads local favicon rows, builds the index, and supplies bookmark icons.
- `README.md` — documents local cached favicon behavior and the `Favicons` data source.

---

### Task 1: Build the local favicon repository

**Files:**
- Create: `src/lib/favicons.ts`
- Create: `tests/favicons.test.ts`

**Interfaces:**
- Consumes: `activeProfilePath("Favicons"): Promise<string>` later in Task 2.
- Produces: `FaviconRow` with `pageUrl`, `imageHex`, `width`, `height`, and `lastUpdated`.
- Produces: `FaviconIndex` with `byUrl` and `byOrigin` read-only string maps.
- Produces: `loadFaviconRows(databasePath: string): Promise<FaviconRow[]>`.
- Produces: `pngDataUriFromHex(imageHex: string): string | undefined`.
- Produces: `buildFaviconIndex(rows: readonly FaviconRow[]): FaviconIndex`.
- Produces: `faviconForUrl(index: FaviconIndex, value: string): string | undefined`.

- [ ] **Step 1: Write the failing PNG, ranking, and matching tests**

Create `tests/favicons.test.ts` with these cases:

```ts
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  buildFaviconIndex,
  faviconForUrl,
  loadFaviconRows,
  pngDataUriFromHex,
  type FaviconRow,
} from "../src/lib/favicons";

const pngA = "89504E470D0A1A0A0102030449454E44AE426082";
const pngB = "89504E470D0A1A0A0506070849454E44AE426082";
const pngC = "89504E470D0A1A0A090A0B0C49454E44AE426082";

function row(overrides: Partial<FaviconRow> = {}): FaviconRow {
  return {
    pageUrl: "https://example.com/docs",
    imageHex: pngA,
    width: 16,
    height: 16,
    lastUpdated: "1",
    ...overrides,
  };
}

test("converts valid PNG hex and rejects malformed image data", () => {
  assert.equal(
    pngDataUriFromHex(pngA),
    `data:image/png;base64,${Buffer.from(pngA, "hex").toString("base64")}`,
  );
  assert.equal(pngDataUriFromHex(""), undefined);
  assert.equal(pngDataUriFromHex("FFD8FFE0"), undefined);
  assert.equal(pngDataUriFromHex("89504E470D0A1A0A0"), undefined);
});

test("prefers the largest bitmap and then the newest equally sized bitmap", () => {
  const index = buildFaviconIndex([
    row({ imageHex: pngA, width: 16, height: 16, lastUpdated: "300" }),
    row({ imageHex: pngB, width: 32, height: 32, lastUpdated: "100" }),
    row({ imageHex: pngC, width: 32, height: 32, lastUpdated: "200" }),
  ]);

  assert.equal(faviconForUrl(index, "https://example.com/docs"), pngDataUriFromHex(pngC));
});

test("uses an exact URL before falling back to the best icon for its origin", () => {
  const index = buildFaviconIndex([
    row({ pageUrl: "https://example.com/account", imageHex: pngA, lastUpdated: "1" }),
    row({ pageUrl: "https://example.com/other", imageHex: pngB, lastUpdated: "2" }),
  ]);

  assert.equal(faviconForUrl(index, "https://example.com/account"), pngDataUriFromHex(pngA));
  assert.equal(faviconForUrl(index, "https://example.com/missing"), pngDataUriFromHex(pngB));
});

test("keeps schemes and non-default ports isolated", () => {
  const index = buildFaviconIndex([
    row({ pageUrl: "https://example.com/", imageHex: pngA }),
    row({ pageUrl: "http://example.com/", imageHex: pngB }),
    row({ pageUrl: "https://example.com:8443/", imageHex: pngC }),
  ]);

  assert.equal(faviconForUrl(index, "https://example.com/new"), pngDataUriFromHex(pngA));
  assert.equal(faviconForUrl(index, "http://example.com/new"), pngDataUriFromHex(pngB));
  assert.equal(faviconForUrl(index, "https://example.com:8443/new"), pngDataUriFromHex(pngC));
  assert.equal(faviconForUrl(index, "not a URL"), undefined);
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npx tsx --test tests/favicons.test.ts`

Expected: FAIL because `src/lib/favicons.ts` does not exist.

- [ ] **Step 3: Implement query, image conversion, ranking, and lookup**

Create `src/lib/favicons.ts` with the following structure and exact exports:

```ts
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

export interface FaviconRow {
  pageUrl: string;
  imageHex: string;
  width: number;
  height: number;
  lastUpdated: string;
}

export interface FaviconIndex {
  byUrl: ReadonlyMap<string, string>;
  byOrigin: ReadonlyMap<string, string>;
}

interface Candidate {
  source: string;
  width: number;
  height: number;
  lastUpdated: bigint;
}

export const FAVICON_QUERY = `
  SELECT mappings.page_url AS pageUrl,
         hex(bitmaps.image_data) AS imageHex,
         bitmaps.width AS width,
         bitmaps.height AS height,
         CAST(bitmaps.last_updated AS TEXT) AS lastUpdated
  FROM icon_mapping AS mappings
  INNER JOIN favicon_bitmaps AS bitmaps ON bitmaps.icon_id = mappings.icon_id
  WHERE length(bitmaps.image_data) > 0;
`;

export function pngDataUriFromHex(imageHex: string): string | undefined {
  const hex = imageHex.trim();
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return undefined;
  if (!hex.toUpperCase().startsWith("89504E470D0A1A0A")) return undefined;
  if (!hex.toUpperCase().endsWith("49454E44AE426082")) return undefined;
  return `data:image/png;base64,${Buffer.from(hex, "hex").toString("base64")}`;
}
```

Add internal helpers that normalize only HTTP and HTTPS URLs, compare candidates by `width * height` and then `lastUpdated`, and retain the best candidate separately for each exact `url.href` and `url.origin`. `buildFaviconIndex` must convert the internal candidate maps into the two source-only maps required by `FaviconIndex`. `faviconForUrl` must return `byUrl.get(url.href) ?? byOrigin.get(url.origin)`.

Use these implementations:

```ts
function normalizedKeys(value: string): { url: string; origin: string } | undefined {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return { url: parsed.href, origin: parsed.origin };
  } catch {
    return undefined;
  }
}

function isBetter(candidate: Candidate, current?: Candidate): boolean {
  if (!current) return true;
  const candidateArea = candidate.width * candidate.height;
  const currentArea = current.width * current.height;
  return candidateArea > currentArea || (candidateArea === currentArea && candidate.lastUpdated > current.lastUpdated);
}

export function buildFaviconIndex(rows: readonly FaviconRow[]): FaviconIndex {
  const exactCandidates = new Map<string, Candidate>();
  const originCandidates = new Map<string, Candidate>();

  for (const row of rows) {
    const keys = normalizedKeys(row.pageUrl);
    const source = pngDataUriFromHex(row.imageHex);
    const width = Number(row.width);
    const height = Number(row.height);
    if (!keys || !source || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) continue;

    const candidate: Candidate = {
      source,
      width,
      height,
      lastUpdated: /^\d+$/.test(row.lastUpdated) ? BigInt(row.lastUpdated) : 0n,
    };
    if (isBetter(candidate, exactCandidates.get(keys.url))) exactCandidates.set(keys.url, candidate);
    if (isBetter(candidate, originCandidates.get(keys.origin))) originCandidates.set(keys.origin, candidate);
  }

  return {
    byUrl: new Map([...exactCandidates].map(([key, candidate]) => [key, candidate.source])),
    byOrigin: new Map([...originCandidates].map(([key, candidate]) => [key, candidate.source])),
  };
}

export function faviconForUrl(index: FaviconIndex, value: string): string | undefined {
  const keys = normalizedKeys(value);
  return keys ? index.byUrl.get(keys.url) ?? index.byOrigin.get(keys.origin) : undefined;
}
```

- [ ] **Step 4: Run the pure tests and verify they pass**

Run: `npx tsx --test tests/favicons.test.ts`

Expected: the PNG, ranking, exact-match, origin-fallback, scheme, and port tests PASS.

- [ ] **Step 5: Add a temporary Chromium-schema database loading test**

Append this test to `tests/favicons.test.ts`:

```ts
test("loads favicon rows from an immutable read-only Chromium database", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ego-favicons-"));
  const databasePath = join(directory, "Favicons");
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE icon_mapping(id INTEGER PRIMARY KEY, page_url TEXT NOT NULL, icon_id INTEGER NOT NULL);
    CREATE TABLE favicon_bitmaps(
      id INTEGER PRIMARY KEY,
      icon_id INTEGER NOT NULL,
      last_updated INTEGER DEFAULT 0,
      image_data BLOB,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0
    );
  `);
  database.prepare("INSERT INTO icon_mapping(page_url, icon_id) VALUES (?, ?)").run("https://example.com/", 7);
  database.exec(`
    INSERT INTO favicon_bitmaps(icon_id, last_updated, image_data, width, height)
    VALUES (7, 13429853725564777, X'${pngA}', 32, 32);
  `);
  database.close();

  assert.deepEqual(await loadFaviconRows(databasePath), [
    {
      pageUrl: "https://example.com/",
      imageHex: pngA,
      width: 32,
      height: 32,
      lastUpdated: "13429853725564777",
    },
  ]);
  assert.deepEqual(await loadFaviconRows(join(directory, "missing")), []);
});
```

- [ ] **Step 6: Implement immutable read-only database loading**

Add this behavior to `src/lib/favicons.ts`:

```ts
export async function loadFaviconRows(databasePath: string): Promise<FaviconRow[]> {
  if (!existsSync(databasePath)) return [];

  const databaseUrl = pathToFileURL(databasePath);
  databaseUrl.searchParams.set("immutable", "1");

  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(databaseUrl, { readOnly: true });
    return database.prepare(FAVICON_QUERY).all() as unknown as FaviconRow[];
  } catch {
    return [];
  } finally {
    database?.close();
  }
}
```

This function intentionally contains all database failures and returns an empty optional dataset.

- [ ] **Step 7: Run the repository tests and full test suite**

Run: `npx tsx --test tests/favicons.test.ts && npm test`

Expected: all favicon tests and all existing tests PASS.

- [ ] **Step 8: Commit the repository**

```bash
git add src/lib/favicons.ts tests/favicons.test.ts
git commit -m "feat: read local Ego Lite favicons"
```

---

### Task 2: Render local favicons in Search Bookmarks

**Files:**
- Modify: `src/components/browser-item.tsx`
- Modify: `src/search-bookmarks.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `loadFaviconRows(databasePath)`, `buildFaviconIndex(rows)`, and `faviconForUrl(index, url)` from Task 1.
- Consumes: `activeProfilePath("Favicons")` from `src/lib/profile.ts`.
- Produces: optional `icon?: List.Item.Props["icon"]` on `BrowserItemProps`.
- Preserves: current bookmark loading/filtering, actions, history rendering, and fallback icons.

- [ ] **Step 1: Add the optional shared-item icon override**

Modify `src/components/browser-item.tsx`:

```tsx
interface BrowserItemProps {
  title: string;
  url: string;
  icon?: List.Item.Props["icon"];
  path?: string;
  lastVisitedAt?: string;
}

function fallbackIconForUrl(url: string): List.Item.Props["icon"] {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return Icon.Link;
    return getAvatarIcon(displayHost(url));
  } catch {
    return Icon.Link;
  }
}

```

Then make these exact substitutions in the existing component body:

```diff
-function iconForUrl(url: string): List.Item.Props["icon"] {
+function fallbackIconForUrl(url: string): List.Item.Props["icon"] {

-export function BrowserItem({ title, url, path, lastVisitedAt }: BrowserItemProps) {
+export function BrowserItem({ title, url, icon, path, lastVisitedAt }: BrowserItemProps) {

-      icon={iconForUrl(url)}
+      icon={icon ?? fallbackIconForUrl(url)}
```

Do not change history or action behavior.

- [ ] **Step 2: Load and index favicons independently of bookmarks**

Modify `src/search-bookmarks.tsx` to add:

```tsx
import { buildFaviconIndex, faviconForUrl, loadFaviconRows } from "./lib/favicons";
import { activeProfilePath } from "./lib/profile";

const { data: faviconRows = [] } = usePromise(async () => {
  const path = await activeProfilePath("Favicons");
  return loadFaviconRows(path);
}, []);
const faviconIndex = useMemo(() => buildFaviconIndex(faviconRows), [faviconRows]);
```

Do not include favicon loading in the list's required `isLoading` state and do not surface favicon errors. Add `icon={faviconForUrl(faviconIndex, bookmark.url)}` to each bookmark `BrowserItem`.

- [ ] **Step 3: Document local cached favicons**

Update `README.md`:

- State that Search Bookmarks shows Ego Lite's locally cached favicon when available and otherwise uses a locally generated domain avatar.
- Add `Favicons` to the read-only local-data file list.
- Preserve the statement that no remote favicon provider or network request is used.
- Explain that unreadable favicon data affects only icons, not bookmark results.

- [ ] **Step 4: Run automated verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: all tests PASS, Raycast lint succeeds, all three command entry points build, and the diff check prints no errors.

- [ ] **Step 5: Run local Raycast UI acceptance**

Run `npm run dev`, open `Search Bookmarks Ego Lite`, and verify through Raycast's actual UI:

1. The command still loads and filters the user's local bookmarks.
2. At least one bookmark whose site is present in Ego Lite's local favicon cache shows its real website icon.
3. A bookmark without a cached icon still shows the existing domain avatar or link fallback.
4. Opening the Action Panel still exposes Open in Ego Lite, Copy URL, Copy Title, and Copy as Markdown.
5. New Tab and Search History remain registered and unchanged.

Stop the development watcher after acceptance.

- [ ] **Step 6: Commit the UI and documentation**

```bash
git add src/components/browser-item.tsx src/search-bookmarks.tsx README.md
git commit -m "feat: show local favicons for Ego Lite bookmarks"
```

---

### Task 3: Final review and branch completion

**Files:**
- Review: all changes since `main`.

**Interfaces:**
- Consumes: the complete implementation from Tasks 1 and 2.
- Produces: a clean, verified feature branch ready for fast-forward merge.

- [ ] **Step 1: Review scope and privacy boundaries**

Confirm from the diff that only the favicon repository, bookmark UI, tests, README, design, and plan changed. Confirm there is no `fetch`, `getFavicon`, remote favicon URL, browser-data write, AI Task Space call, or Search History/New Tab behavior change.

- [ ] **Step 2: Run the final clean verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check main...HEAD
git status --short
```

Expected: all commands succeed and the worktree is clean.

- [ ] **Step 3: Fast-forward the verified feature branch**

After code review has no unresolved critical or important findings:

```bash
git switch main
git merge --ff-only feat/local-bookmark-favicons
```

Expected: `main` points to the verified favicon implementation and retains linear history.
