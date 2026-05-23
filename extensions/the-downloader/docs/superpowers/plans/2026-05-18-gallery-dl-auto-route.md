# gallery-dl + Auto-Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single yt-dlp Download command into a URL-routing dispatcher, add gallery-dl image-gallery downloads, and surface YouTube transcript extraction as a video output option.

**Architecture:** The Download command (`index.tsx`) becomes a thin router that detects a URL's source type and renders a typed form (`video-form` or `gallery-form`). Per-tool logic lives in isolated `lib/` modules. Pure logic (detection, binary resolution, argument building) is unit-tested with vitest; UI is verified manually in Raycast dev mode.

**Tech Stack:** Raycast API (TypeScript + React), `execa` / `node:child_process` for CLI spawning, yt-dlp + gallery-dl + ffmpeg CLIs, vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-05-18-gallery-dl-auto-route-design.md`

---

## File Structure

**Create:**
- `vitest.config.ts` — test runner config
- `src/lib/binary.ts` — `resolveBinary(name, prefPath)`
- `src/lib/detect.ts` — `detectSource(url)`
- `src/lib/ytdlp.ts` — yt-dlp metadata + download operations
- `src/lib/gallerydl.ts` — gallery-dl argument building + download
- `src/views/video-form.tsx` — the yt-dlp Form (extracted from `index.tsx`)
- `src/views/gallery-form.tsx` — the gallery-dl Form
- `tests/binary.test.ts`, `tests/detect.test.ts`, `tests/gallerydl.test.ts`

**Modify:**
- `src/index.tsx` — becomes the router
- `src/utils.ts` — binary path functions delegate to `lib/binary.ts`
- `src/types.ts` — add `SourceType`
- `src/views/installer.tsx` — tool-aware
- `src/views/updater.tsx` — tool-aware
- `src/transcript.ts` — use `lib/binary.ts`
- `src/tools/download-video.ts` — use `lib/ytdlp.ts`
- `package.json` — add preferences + devDependency + test script

**Task ordering note:** Tasks 2 and 7 reference preferences that Task 11 adds to `package.json`. The plan tolerates the gap (absent preferences resolve to `undefined`), but for a strictly forward-reference-free order an executor may run Task 11 immediately after Task 1.

---

## Task 1: Set up vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Add vitest as a devDependency and a test script**

In `package.json`, add `"vitest": "^3.0.0"` to `devDependencies` and `"test": "vitest run"` to `scripts`. Then run:

```bash
cd TheDownloader && npm install
```

- [ ] **Step 2: Create the vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Create a smoke test**

Create `tests/smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("vitest", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run the test suite**

Run: `npm test`
Expected: PASS — `tests/smoke.test.ts` 1 passed.

- [ ] **Step 5: Delete the smoke test and commit**

```bash
rm tests/smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "Add vitest for unit testing"
```

---

## Task 2: lib/binary.ts — generic binary resolution

**Files:**
- Create: `src/lib/binary.ts`, `tests/binary.test.ts`
- Modify: `src/utils.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/binary.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import * as fs from "node:fs";
import { resolveBinary } from "../src/lib/binary";

afterEach(() => vi.restoreAllMocks());

describe("resolveBinary", () => {
  it("returns the preference path when it exists on disk", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    expect(resolveBinary("yt-dlp", "/custom/bin/yt-dlp")).toBe("/custom/bin/yt-dlp");
  });

  it("falls back to a default path when the preference is missing", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const result = resolveBinary("yt-dlp", "/missing/yt-dlp");
    expect(result).toContain("yt-dlp");
    expect(result).not.toBe("/missing/yt-dlp");
  });

  it("resolves a default path when no preference is given", () => {
    expect(resolveBinary("gallery-dl")).toContain("gallery-dl");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- binary`
Expected: FAIL — cannot find module `../src/lib/binary`.

- [ ] **Step 3: Implement lib/binary.ts**

Create `src/lib/binary.ts`:

```typescript
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

function whichWindows(name: string): string {
  try {
    return execSync(`where ${name}`).toString().split("\n")[0].replace(/[\r\n]/g, "").trim();
  } catch {
    return "";
  }
}

/**
 * Resolve the path to a CLI binary: the user-configured preference path if
 * it exists on disk, otherwise the platform default location.
 */
export function resolveBinary(name: string, preferencePath?: string): string {
  const pref = isWindows ? preferencePath?.replace(/[\r\n]/g, "").trim() : preferencePath;
  if (pref && existsSync(pref)) return pref;
  if (isMac) return `/opt/homebrew/bin/${name}`;
  if (isWindows) return whichWindows(name);
  return `/usr/bin/${name}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- binary`
Expected: PASS — 3 passed.

- [ ] **Step 5: Rewire utils.ts to delegate**

In `src/utils.ts`, replace the bodies of `getytdlPath`, `getffmpegPath`, `getffprobePath` so each is a one-line call to `resolveBinary` (keep the exported names — callers stay unchanged). Add `getGalleryDlPath`. Example:

```typescript
import { resolveBinary } from "./lib/binary.js";

export const getytdlPath = () => resolveBinary("yt-dlp", ytdlPathPreference);
export const getffmpegPath = () => resolveBinary("ffmpeg", ffmpegPathPreference);
export const getffprobePath = () => resolveBinary("ffprobe", ffprobePathPreference);
export const getGalleryDlPath = () => resolveBinary("gallery-dl", galleryDlPathPreference);
```

`galleryDlPathPreference` is added to the `getPreferenceValues` destructure in Task 11; until then it is `undefined`, which `resolveBinary` handles. Keep `isWindows`/`isMac` re-exported from `utils.ts` for existing importers (re-export from `lib/binary.ts`).

- [ ] **Step 6: Verify the build and commit**

Run: `npm run build`
Expected: builds with no type errors.

```bash
git add src/lib/binary.ts tests/binary.test.ts src/utils.ts
git commit -m "Extract binary resolution into lib/binary.ts"
```

---

## Task 3: lib/detect.ts — source-type detection

**Files:**
- Create: `src/lib/detect.ts`, `tests/detect.test.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Add the SourceType type**

In `src/types.ts`, add:

```typescript
export type SourceType = "video" | "gallery";
```

- [ ] **Step 2: Write the failing test**

Create `tests/detect.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { detectSource } from "../src/lib/detect";

describe("detectSource", () => {
  it("routes known video domains to video", () => {
    expect(detectSource("https://www.youtube.com/watch?v=abc")).toBe("video");
    expect(detectSource("https://youtu.be/abc")).toBe("video");
    expect(detectSource("https://twitch.tv/stream")).toBe("video");
  });

  it("routes known gallery domains to gallery", () => {
    expect(detectSource("https://www.reddit.com/r/pics")).toBe("gallery");
    expect(detectSource("https://imgur.com/a/abc")).toBe("gallery");
    expect(detectSource("https://www.pixiv.net/en/users/123")).toBe("gallery");
  });

  it("defaults unknown domains to video", () => {
    expect(detectSource("https://unknown-site.example/x")).toBe("video");
  });

  it("handles URLs without a protocol", () => {
    expect(detectSource("youtube.com/watch?v=abc")).toBe("video");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- detect`
Expected: FAIL — cannot find module `../src/lib/detect`.

- [ ] **Step 4: Implement lib/detect.ts**

Create `src/lib/detect.ts`:

```typescript
import { SourceType } from "../types.js";

const GALLERY_DOMAINS = [
  "reddit.com", "redd.it", "imgur.com", "pixiv.net", "deviantart.com",
  "flickr.com", "danbooru.donmai.us", "gelbooru.com", "artstation.com",
  "pinterest.com", "tumblr.com", "instagram.com",
];

const VIDEO_DOMAINS = [
  "youtube.com", "youtu.be", "twitch.tv", "vimeo.com", "tiktok.com",
  "x.com", "twitter.com", "bilibili.com", "dailymotion.com",
];

function hostnameOf(url: string): string {
  try {
    const withProtocol = url.startsWith("http") ? url : `https://${url}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function matches(host: string, domains: string[]): boolean {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Detect whether a URL is a video source (yt-dlp) or an image gallery
 * (gallery-dl). Unknown domains default to "video" — yt-dlp's generic
 * extractor covers the broadest range of sites.
 */
export function detectSource(url: string): SourceType {
  const host = hostnameOf(url);
  if (!host) return "video";
  if (matches(host, GALLERY_DOMAINS)) return "gallery";
  return "video";
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- detect`
Expected: PASS — 4 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/detect.ts tests/detect.test.ts src/types.ts
git commit -m "Add lib/detect.ts source-type detection"
```

---

## Task 4: lib/ytdlp.ts — extract yt-dlp operations

**Files:**
- Create: `src/lib/ytdlp.ts`
- Modify: `src/index.tsx`, `src/tools/download-video.ts`

- [ ] **Step 1: Create lib/ytdlp.ts with the metadata fetch**

Create `src/lib/ytdlp.ts`. Move the `usePromise` body from `index.tsx` (lines ~185-203) into a standalone function:

```typescript
import { execa } from "execa";
import { Video } from "../types.js";

/** Fetch yt-dlp metadata for a URL via --dump-json. */
export async function fetchVideoInfo(ytdlPath: string, url: string, forceIpv4: boolean): Promise<Video> {
  const result = await execa(
    ytdlPath,
    [forceIpv4 ? "--force-ipv4" : "", "--no-playlist", "--dump-json", "--format-sort=resolution,ext,tbr", url].filter(Boolean),
    { env: { ...process.env, PYTHONUNBUFFERED: "1" } },
  );
  return JSON.parse(result.stdout) as Video;
}
```

- [ ] **Step 2: Add the download-args builder**

Append to `src/lib/ytdlp.ts`. This consolidates the argument logic currently inline in `index.tsx`'s `onSubmit` (lines ~62-83) and `tools/download-video.ts` (lines ~55-68):

```typescript
import path from "node:path";
import { MP3_FORMAT_ID } from "../utils.js";

export type VideoDownloadArgs = {
  url: string;
  format: string;
  outputTemplate: string;
  ffmpegPath: string;
};

/** Build yt-dlp CLI args for a media download. */
export function buildVideoDownloadArgs(a: VideoDownloadArgs): string[] {
  const args = ["-o", a.outputTemplate, "--ffmpeg-location", a.ffmpegPath];
  const [downloadFormat, recodeFormat] = a.format.split("#");
  if (a.format === MP3_FORMAT_ID) {
    args.push("--extract-audio", "--audio-format", "mp3", "--audio-quality", "0");
  } else {
    args.push("--format", downloadFormat, "--recode-video", recodeFormat);
  }
  args.push("--progress", "--print", "after_move:filepath", a.url);
  return args;
}
```

- [ ] **Step 3: Point index.tsx and download-video.ts at the new module**

`fetchVideoInfo` is shared: in `src/index.tsx` replace the inline `usePromise` execa call with `fetchVideoInfo(ytdlPath, url, forceIpv4)`; in `src/tools/download-video.ts` replace the inline `--dump-json` call with `fetchVideoInfo(...)`.

`buildVideoDownloadArgs` is for the video form only: in `index.tsx`'s `onSubmit`, replace the inline yt-dlp argument array (lines ~62-83) with `buildVideoDownloadArgs(...)`. Leave `download-video.ts`'s own argument array unchanged — that AI tool auto-selects the best format and uses a different invocation. Do not change behaviour — only the source of the logic.

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: builds with no type errors.

- [ ] **Step 5: Verify in dev mode**

Run `npm run dev`, open the Download command, paste a YouTube URL, confirm the title + format dropdown still populate, and download one video. It must behave exactly as before.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ytdlp.ts src/index.tsx src/tools/download-video.ts
git commit -m "Extract yt-dlp operations into lib/ytdlp.ts"
```

---

## Task 5: views/video-form.tsx — extract the yt-dlp form

**Files:**
- Create: `src/views/video-form.tsx`
- Modify: `src/index.tsx`

- [ ] **Step 1: Move the form component into video-form.tsx**

Create `src/views/video-form.tsx`. Move the entire `DownloadVideo` component body from `index.tsx` into it, renamed `VideoForm`, and change it to accept the URL as a prop instead of owning auto-load:

```typescript
export function VideoForm({ url, onUrlChange }: { url: string; onUrlChange: (u: string) => void }) {
  // ... the existing DownloadVideo body ...
}
```

The `useForm` `initialValues.url` becomes the `url` prop. The URL `Form.TextField`'s `onChange` calls `onUrlChange`. Remove the auto-load `useEffect` (lines ~231-262) — that moves to the router in Task 8. Keep everything else (format dropdown, submit, validation, the `Installer` guard) unchanged.

- [ ] **Step 2: Make index.tsx render VideoForm**

Temporarily make `src/index.tsx` a thin wrapper so the extension keeps working:

```typescript
import { useState } from "react";
import { VideoForm } from "./views/video-form.js";

export default function Command() {
  const [url, setUrl] = useState("");
  return <VideoForm url={url} onUrlChange={setUrl} />;
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: builds with no type errors.

- [ ] **Step 4: Verify in dev mode**

Run `npm run dev`, open Download, confirm the video form works exactly as before (paste URL, pick format, download).

- [ ] **Step 5: Commit**

```bash
git add src/views/video-form.tsx src/index.tsx
git commit -m "Extract the yt-dlp form into views/video-form.tsx"
```

---

## Task 6: lib/gallerydl.ts — gallery-dl operations

**Files:**
- Create: `src/lib/gallerydl.ts`, `tests/gallerydl.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/gallerydl.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildGalleryArgs } from "../src/lib/gallerydl";

describe("buildGalleryArgs", () => {
  it("sets the base destination with -d", () => {
    expect(buildGalleryArgs({ url: "https://imgur.com/a/x", destination: "/Downloads" }))
      .toEqual(["-d", "/Downloads", "https://imgur.com/a/x"]);
  });

  it("adds --cookies-from-browser when a browser is set", () => {
    expect(buildGalleryArgs({ url: "https://pixiv.net/u/1", destination: "/d", cookiesFromBrowser: "safari" }))
      .toEqual(["-d", "/d", "--cookies-from-browser", "safari", "https://pixiv.net/u/1"]);
  });

  it("omits cookies when none is set", () => {
    expect(buildGalleryArgs({ url: "https://imgur.com/a/x", destination: "/d", cookiesFromBrowser: "" }))
      .not.toContain("--cookies-from-browser");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- gallerydl`
Expected: FAIL — cannot find module `../src/lib/gallerydl`.

- [ ] **Step 3: Implement lib/gallerydl.ts**

Create `src/lib/gallerydl.ts`:

```typescript
import { spawn } from "node:child_process";

export type GalleryDownloadOptions = {
  url: string;
  destination: string;
  cookiesFromBrowser?: string;
};

/** Build gallery-dl CLI args. `-d` is the base dir; gallery-dl creates per-site subfolders. */
export function buildGalleryArgs(o: GalleryDownloadOptions): string[] {
  const args = ["-d", o.destination];
  if (o.cookiesFromBrowser) args.push("--cookies-from-browser", o.cookiesFromBrowser);
  args.push(o.url);
  return args;
}

export type GalleryProgress = { files: number };

/** Run gallery-dl; onProgress fires as files land. Resolves with the count or rejects with stderr. */
export function runGalleryDownload(
  binaryPath: string,
  options: GalleryDownloadOptions,
  onProgress: (p: GalleryProgress) => void,
): Promise<GalleryProgress> {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, buildGalleryArgs(options));
    let files = 0;
    let stderr = "";
    child.stdout.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter((l) => l.trim().length > 0);
      files += lines.length;
      onProgress({ files });
    });
    child.stderr.on("data", (data: Buffer) => (stderr += data.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ files });
      else reject(new Error(stderr.trim() || `gallery-dl exited with code ${code}`));
    });
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- gallerydl`
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gallerydl.ts tests/gallerydl.test.ts
git commit -m "Add lib/gallerydl.ts gallery-dl operations"
```

---

## Task 7: views/gallery-form.tsx — the gallery form

**Files:**
- Create: `src/views/gallery-form.tsx`

- [ ] **Step 1: Implement the gallery form**

Create `src/views/gallery-form.tsx`:

```typescript
import { useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { Action, ActionPanel, Form, Icon, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { getGalleryDlPath } from "../utils.js";
import { runGalleryDownload } from "../lib/gallerydl.js";
import Installer from "./installer.js";

export function GalleryForm({ url }: { url: string }) {
  const [refresh, setRefresh] = useState(0);
  const { downloadPath, cookiesFromBrowser } = getPreferenceValues<ExtensionPreferences>();
  const galleryDlPath = getGalleryDlPath();

  if (!fs.existsSync(galleryDlPath)) {
    return <Installer executable="gallery-dl" onRefresh={() => setRefresh(refresh + 1)} />;
  }

  async function onSubmit(values: { url: string; destination: string[] }) {
    const destination = values.destination[0] ?? downloadPath;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading Gallery", message: "0 files" });
    try {
      const { files } = await runGalleryDownload(
        galleryDlPath,
        { url: values.url, destination, cookiesFromBrowser: cookiesFromBrowser || undefined },
        (p) => { toast.message = `${p.files} files`; },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Gallery Downloaded";
      toast.message = `${files} files`;
      toast.primaryAction = { title: "Open Folder", onAction: () => open(destination) };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download Failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Download} title="Download Gallery" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" defaultValue={url} placeholder="https://imgur.com/a/..." />
      <Form.FilePicker
        id="destination"
        title="Destination"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={[downloadPath]}
      />
    </Form>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: builds with no type errors. (`cookiesFromBrowser` preference is added in Task 11; if the build complains before then, it is fine to do Task 11 first.)

- [ ] **Step 3: Commit**

```bash
git add src/views/gallery-form.tsx
git commit -m "Add views/gallery-form.tsx"
```

---

## Task 8: index.tsx — the router

**Files:**
- Modify: `src/index.tsx`, `src/views/video-form.tsx`

- [ ] **Step 1: Build the router**

Replace `src/index.tsx` with a router that owns the URL + auto-load + detection. Move the auto-load `useEffect` removed in Task 5 here:

```typescript
import { useEffect, useState } from "react";
import { BrowserExtension, Clipboard, getPreferenceValues, getSelectedText } from "@raycast/api";
import { detectSource } from "./lib/detect.js";
import { SourceType } from "./types.js";
import { isValidUrl } from "./utils.js";
import { VideoForm } from "./views/video-form.js";
import { GalleryForm } from "./views/gallery-form.js";

const { autoLoadUrlFromClipboard, autoLoadUrlFromSelectedText, enableBrowserExtensionSupport } =
  getPreferenceValues<ExtensionPreferences>();

export default function Command() {
  const [url, setUrl] = useState("");
  const [type, setType] = useState<SourceType>("video");
  const [typeTouched, setTypeTouched] = useState(false);

  useEffect(() => {
    (async () => {
      let loaded = "";
      if (autoLoadUrlFromClipboard) {
        const text = await Clipboard.readText();
        if (text && isValidUrl(text)) loaded = text;
      }
      if (!loaded && autoLoadUrlFromSelectedText) {
        try {
          const text = await getSelectedText();
          if (text && isValidUrl(text)) loaded = text;
        } catch { /* no selection */ }
      }
      if (!loaded && enableBrowserExtensionSupport) {
        try {
          const tab = (await BrowserExtension.getTabs()).find((t) => t.active)?.url;
          if (tab && isValidUrl(tab)) loaded = tab;
        } catch { /* no browser extension */ }
      }
      if (loaded) { setUrl(loaded); if (!typeTouched) setType(detectSource(loaded)); }
    })();
  }, []);

  function handleUrlChange(next: string) {
    setUrl(next);
    if (!typeTouched && isValidUrl(next)) setType(detectSource(next));
  }

  function handleTypeChange(next: SourceType) {
    setTypeTouched(true);
    setType(next);
  }

  return type === "gallery"
    ? <GalleryForm url={url} typeValue={type} onTypeChange={handleTypeChange} />
    : <VideoForm url={url} onUrlChange={handleUrlChange} typeValue={type} onTypeChange={handleTypeChange} />;
}
```

- [ ] **Step 2: Add the Type dropdown to both forms**

In both `video-form.tsx` and `gallery-form.tsx`, accept `typeValue: SourceType` and `onTypeChange: (t: SourceType) => void` props and render this as the first field inside `<Form>`:

```typescript
<Form.Dropdown id="sourceType" title="Type" value={typeValue} onChange={(v) => onTypeChange(v as SourceType)}>
  <Form.Dropdown.Item value="video" title="Video / Audio" />
  <Form.Dropdown.Item value="gallery" title="Gallery" />
</Form.Dropdown>
```

`video-form.tsx` must also call `onUrlChange` from its URL field's `onChange` so router detection updates as the user types.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: builds with no type errors.

- [ ] **Step 4: Verify in dev mode**

Run `npm run dev`. Paste a YouTube URL → the form shows Video and the format dropdown. Paste a Reddit/imgur URL → it switches to the gallery form. Flip the Type dropdown manually → the form switches and stays on the manual choice.

- [ ] **Step 5: Commit**

```bash
git add src/index.tsx src/views/video-form.tsx src/views/gallery-form.tsx
git commit -m "Make index.tsx a URL-routing dispatcher"
```

---

## Task 9: Tool-aware installer and updater

**Files:**
- Modify: `src/views/installer.tsx`, `src/views/updater.tsx`

- [ ] **Step 1: Make the installer install the requested tool**

In `installer.tsx`, the `AutoInstall` Homebrew action currently runs `brew install yt-dlp ffmpeg` hardcoded (line ~69). Change it to install the `executable` prop passed in:

```typescript
await execa(homebrewPath, ["install", executable]);
```

Pass `executable` from `Installer` down into `AutoInstall`. For `gallery-dl`, `executable` will be `"gallery-dl"`.

- [ ] **Step 2: Make the updater tool-aware**

In `updater.tsx`, the version/outdated/upgrade functions hardcode `["yt-dlp", "ffmpeg"]`. Add `gallery-dl` to the macOS tool list in `getVersions`, `getOutdated`, and `upgrade` so it is version-checked and upgradable alongside the others.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: builds with no type errors.

- [ ] **Step 4: Verify in dev mode**

If `gallery-dl` is not installed, the gallery form should show the Installer for `gallery-dl` and installing it via Homebrew should succeed. The Updater should list `gallery-dl`.

- [ ] **Step 5: Commit**

```bash
git add src/views/installer.tsx src/views/updater.tsx
git commit -m "Make installer and updater tool-aware"
```

---

## Task 10: Transcript output option

**Files:**
- Modify: `src/views/video-form.tsx`

- [ ] **Step 1: Add a Transcript item to the format dropdown**

In `video-form.tsx`'s format `Form.Dropdown`, add a new section with one item:

```typescript
<Form.Dropdown.Section title="Transcript">
  <Form.Dropdown.Item value="transcript" title="Transcript (.txt)" />
</Form.Dropdown.Section>
```

- [ ] **Step 2: Branch the submit handler**

In the `onSubmit` of `video-form.tsx`, before building yt-dlp download args, branch on the transcript value:

```typescript
if (values.format === "transcript") {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Extracting Transcript" });
  try {
    const { transcript, title } = await extractTranscript(values.url);
    const filePath = path.join(downloadPath, `${title}.txt`);
    fs.writeFileSync(filePath, transcript, "utf-8");
    toast.style = Toast.Style.Success;
    toast.title = "Transcript Saved";
    toast.message = title;
    toast.primaryAction = { title: "Open", onAction: () => open(filePath) };
    toast.secondaryAction = { title: "Copy Transcript", onAction: () => Clipboard.copy(transcript) };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "No Transcript Available";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
  return;
}
```

Import `extractTranscript` from `../transcript.js`. `extractTranscript` already exists and uses yt-dlp captions — no change needed there beyond the Task 2 binary rewire.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: builds with no type errors.

- [ ] **Step 4: Verify in dev mode**

Run `npm run dev`, paste a YouTube URL, pick "Transcript (.txt)", submit. A `.txt` file with the transcript must appear in the download folder; the toast offers Open and Copy.

- [ ] **Step 5: Commit**

```bash
git add src/views/video-form.tsx
git commit -m "Add transcript output option to the video form"
```

---

## Task 11: package.json preferences

**Files:**
- Modify: `package.json`, `src/utils.ts`

- [ ] **Step 1: Add the new preferences**

In `package.json`, add to the `preferences` array:

```json
{
  "name": "galleryDlPath",
  "title": "gallery-dl Path",
  "description": "Path to the gallery-dl executable. Run `which gallery-dl` to find it.",
  "type": "textfield",
  "required": false
},
{
  "name": "cookiesFromBrowser",
  "title": "Cookies from Browser",
  "description": "Browser to read cookies from for login-gated galleries.",
  "type": "dropdown",
  "default": "",
  "required": false,
  "data": [
    { "title": "None", "value": "" },
    { "title": "Safari", "value": "safari" },
    { "title": "Chrome", "value": "chrome" },
    { "title": "Firefox", "value": "firefox" },
    { "title": "Brave", "value": "brave" },
    { "title": "Edge", "value": "edge" }
  ]
}
```

Also update the `index` command `description` from "Download video with parameters" to "Download video, audio, galleries, or transcripts".

- [ ] **Step 2: Destructure the new preference in utils.ts**

In `src/utils.ts`, add `galleryDlPath: galleryDlPathPreference` to the `getPreferenceValues` destructure used by `getGalleryDlPath` (Task 2).

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: builds with no type errors; `ExtensionPreferences` now includes `galleryDlPath` and `cookiesFromBrowser`.

- [ ] **Step 4: Commit**

```bash
git add package.json src/utils.ts
git commit -m "Add gallery-dl path and cookies preferences"
```

---

## Final Verification

After all tasks, run the full check:

- [ ] `npm test` — all unit tests pass (binary, detect, gallerydl).
- [ ] `npm run build` — no type errors.
- [ ] `npm run lint` — no lint errors.
- [ ] `npm run dev` manual pass:
  - YouTube URL → video form → download a video.
  - YouTube URL → "Transcript (.txt)" → transcript file saved.
  - Reddit/imgur gallery URL → gallery form → images downloaded into subfolders.
  - Type dropdown override works in both directions.
  - With `gallery-dl` uninstalled, the gallery form shows the Installer.

When green, merge `feature/gallery-dl-auto-route` into `develop`.
