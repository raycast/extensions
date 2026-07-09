# Automatic Image Downscale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Oversized images are automatically downscaled via macOS `sips` instead of being rejected.

**Architecture:** `src/lib/attachments.ts` gains `downscaleImage` (sips → cached JPEG copy in a caller-provided dir) and `classifyPath` gains an `options.imageCacheDir` parameter; ChatView passes `environment.supportPath/attachments`. No other module changes — payload/transcript already work off `Attachment.path`.

**Tech Stack:** node:child_process `execFile` (promisified) + macOS `sips`, node:crypto hash for the cache key, vitest.

**Spec:** `docs/superpowers/specs/2026-07-09-image-downscale-design.md`

## Global Constraints

- Thresholds verbatim: downscale when size > `MAX_IMAGE_BYTES` (10 MB) OR long edge > `MAX_IMAGE_DIMENSION` (2048). Output: JPEG, long edge ≤ 2048, quality ~85%.
- Cache key: sha1 of `path:mtimeMs:size`, first 16 hex chars, file `<hash>.jpg` in the cache dir; reuse when it already exists.
- Without `imageCacheDir`, oversized images keep the OLD rejection behavior (`<name>: image larger than 10 MB`).
- `sips` failure on an oversized image → reject with `<name>: could not downscale image`. Dimensions unreadable but size ≤ 10 MB → accept original.
- After each task: `npm run build`, `npm run lint` (fix-lint on Prettier failures, re-verify), `npx vitest run` — all pass (only the pre-existing package.json title-case warning acceptable).
- Tests must not require a running LM Studio server. Tests MAY invoke `sips` (repo is macOS-only Raycast).
- All commits on branch `feat/image-downscale`. Do not commit `.claude/` or `CLAUDE.md`.

---

### Task 1: Downscale logic in attachments module

**Files:**
- Modify: `src/lib/attachments.ts`
- Test: `tests/attachments.test.ts` (add cases)

**Interfaces:**
- Consumes: existing `classifyPath`, `MAX_IMAGE_BYTES`, `Attachment`.
- Produces: `MAX_IMAGE_DIMENSION = 2048`; `downscaleImage(path: string, cacheDir: string): Promise<string>`; `classifyPath(path: string, options?: { imageCacheDir?: string })` — Task 2's ChatView relies on these exact signatures.

- [ ] **Step 1: Add failing tests** — append to `tests/attachments.test.ts`. Add to the imports: `MAX_IMAGE_DIMENSION`, and from node: `import { execFile } from "node:child_process"; import { promisify } from "node:util";` plus `const execFileAsync = promisify(execFile);` at top level. In `beforeAll`, after the existing fixture writes, add:

```ts
  // 3000x3000 oversized fixture built from the tiny PNG via sips (macOS built-in)
  await execFileAsync("sips", [
    "-z", "3000", "3000",
    join(dir, "shot.png"),
    "--out", join(dir, "big.png"),
  ]);
  cacheDir = join(dir, "cache");
```

Declare `let cacheDir: string;` next to `let dir: string;`. Then append this describe block:

```ts
describe("image downscaling", () => {
  it("keeps small images at their original path (no copy)", async () => {
    const r = await classifyPath(join(dir, "shot.png"), { imageCacheDir: cacheDir });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.attachment.path).toBe(join(dir, "shot.png"));
  });

  it("downscales oversized images into the cache dir as jpg", async () => {
    const r = await classifyPath(join(dir, "big.png"), { imageCacheDir: cacheDir });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.attachment.name).toBe("big.png");
    expect(r.attachment.path.startsWith(cacheDir)).toBe(true);
    expect(r.attachment.path.endsWith(".jpg")).toBe(true);
    const { stdout } = await execFileAsync("sips", [
      "-g", "pixelWidth", "-g", "pixelHeight",
      r.attachment.path,
    ]);
    const w = Number(/pixelWidth: (\d+)/.exec(stdout)?.[1]);
    const h = Number(/pixelHeight: (\d+)/.exec(stdout)?.[1]);
    expect(Math.max(w, h)).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
  });

  it("reuses the cached copy on repeat classification", async () => {
    const first = await classifyPath(join(dir, "big.png"), { imageCacheDir: cacheDir });
    const second = await classifyPath(join(dir, "big.png"), { imageCacheDir: cacheDir });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.attachment.path).toBe(first.attachment.path);
    }
  });

  it("rejects oversized images when no cache dir is provided", async () => {
    const r = await classifyPath(join(dir, "big.png"));
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/attachments.test.ts`
Expected: FAIL — `MAX_IMAGE_DIMENSION` not exported; oversized-image cases fail (current code accepts big.png untouched since it is < 10 MB, so the "downscales" and "rejects without cache dir" tests both fail).

- [ ] **Step 3: Implement in `src/lib/attachments.ts`**

Add imports at the top:

```ts
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { basename, extname, join } from "node:path";
```

(Keep existing imports; this extends them — `mkdir` and `join` and the two new modules are the additions.)

Add below the existing constants:

```ts
export const MAX_IMAGE_DIMENSION = 2048;

const execFileAsync = promisify(execFile);

async function imageDimensions(
  path: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const { stdout } = await execFileAsync("sips", [
      "-g",
      "pixelWidth",
      "-g",
      "pixelHeight",
      path,
    ]);
    const width = Number(/pixelWidth: (\d+)/.exec(stdout)?.[1]);
    const height = Number(/pixelHeight: (\d+)/.exec(stdout)?.[1]);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    return { width, height };
  } catch {
    return null;
  }
}

/**
 * Downscale an image to MAX_IMAGE_DIMENSION (long edge) as a cached JPEG
 * copy inside cacheDir. The cache key includes mtime and size, so an edited
 * original produces a fresh copy while repeats reuse the existing one.
 */
export async function downscaleImage(
  path: string,
  cacheDir: string,
): Promise<string> {
  const s = await stat(path);
  const hash = createHash("sha1")
    .update(`${path}:${s.mtimeMs}:${s.size}`)
    .digest("hex")
    .slice(0, 16);
  const dest = join(cacheDir, `${hash}.jpg`);
  try {
    await stat(dest);
    return dest;
  } catch {
    // not cached yet
  }
  await mkdir(cacheDir, { recursive: true });
  await execFileAsync("sips", [
    "-Z",
    String(MAX_IMAGE_DIMENSION),
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    "85",
    path,
    "--out",
    dest,
  ]);
  return dest;
}
```

Replace the image branch of `classifyPath` (and its signature) with:

```ts
export async function classifyPath(
  path: string,
  options?: { imageCacheDir?: string },
): Promise<ClassifyResult> {
```

```ts
  if (IMAGE_EXTENSIONS.has(ext(path))) {
    const dimensions = await imageDimensions(path);
    const oversized =
      size > MAX_IMAGE_BYTES ||
      (dimensions !== null &&
        Math.max(dimensions.width, dimensions.height) > MAX_IMAGE_DIMENSION);
    if (!oversized) {
      return { ok: true, attachment: { type: "image", path, name } };
    }
    if (!options?.imageCacheDir) {
      return { ok: false, reason: `${name}: image larger than 10 MB` };
    }
    try {
      const downscaled = await downscaleImage(path, options.imageCacheDir);
      return { ok: true, attachment: { type: "image", path: downscaled, name } };
    } catch {
      return { ok: false, reason: `${name}: could not downscale image` };
    }
  }
```

(The text branch is unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/attachments.test.ts` → 11 tests PASS. Then `npx vitest run` → 55 total pass.

- [ ] **Step 5: Verify build/lint and commit**

Run: `npm run build && npm run lint` (fix-lint if needed).

```bash
git add src/lib/attachments.ts tests/attachments.test.ts
git commit -m "feat: downscale oversized images via sips instead of rejecting"
```

---

### Task 2: Wire cache dir in ChatView + docs

**Files:**
- Modify: `src/views/ChatView.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `classifyPath(path, { imageCacheDir })` from Task 1; `environment` from `@raycast/api`.
- Produces: final wired behavior + accurate docs.

- [ ] **Step 1: ChatView changes** — in `src/views/ChatView.tsx`:

(a) Add `environment` to the `@raycast/api` import list and add a node:path import after it:

```tsx
import { join } from "node:path";
```

(b) Inside the `ChatView` function body, next to the other derived constants (after `initialSentRef`), add:

```tsx
  const imageCacheDir = join(environment.supportPath, "attachments");
```

(c) In `addAttachments`, change the classify call to:

```tsx
      const result = await classifyPath(path, { imageCacheDir });
```

- [ ] **Step 2: README** — in the `### Chat` attachment paragraph, replace the sentence fragment `Up to 5 attachments per message (images ≤ 10 MB, text ≤ 200 KB).` with:

```markdown
Up to 5 attachments per message (text ≤ 200 KB; oversized images are automatically downscaled before sending).
```

- [ ] **Step 3: CHANGELOG** — append this bullet to the `## [Initial Version] - {PR_MERGE_DATE}` entry list:

```markdown
- Oversized images are automatically downscaled (macOS `sips`, long edge ≤ 2048 px) instead of being rejected
```

- [ ] **Step 4: Full verification**

Run: `npm test && npm run lint && npm run build`
Expected: all exit 0 (55 tests; only the title-case warning).

- [ ] **Step 5: Commit**

```bash
git add src/views/ChatView.tsx README.md CHANGELOG.md
git commit -m "feat: wire image downscale cache dir and document it"
```
