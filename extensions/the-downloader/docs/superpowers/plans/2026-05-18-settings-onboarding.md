# Settings & Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-content-type download-default preferences and a first-run onboarding view, establishing the configuration layer that Sections 2 and 4 will consume.

**Architecture:** Settings are native Raycast preferences declared in `package.json`. A new `src/lib/config.ts` exposes them as a typed object plus a pure, unit-tested yt-dlp format-selector mapper. A new `src/views/onboarding.tsx` `Detail` welcomes first-run users and reports CLI-tool status; `src/index.tsx` gates onto it via a `LocalStorage` flag.

**Tech Stack:** Raycast API (TypeScript + React), `execa` for CLI spawning, vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-05-18-settings-onboarding-design.md`

**Branch:** `feature/settings-onboarding` (already created off `develop`).

---

## File Structure

**Create:**
- `src/lib/config.ts` — typed `DownloaderConfig` + `getConfig()` reader + the pure `videoFormatSelector()` mapper. The single import point for Sections 2 & 4.
- `src/views/onboarding.tsx` — the first-run onboarding `Detail`: welcome, CLI-tool checklist, install action.
- `tests/config.test.ts` — unit tests for `videoFormatSelector`.

**Modify:**
- `package.json` — add five preferences; retitle + reorder the existing ones.
- `src/index.tsx` — gate the first run on a `LocalStorage` onboarding flag.
- `src/views/video-form.tsx` — add a "Setup & Tools" action that re-opens onboarding.

**Task ordering:** Tasks run 1 → 5 in order. Each builds on the last with no forward references: Task 2 reads preferences added in Task 1; Tasks 4 and 5 import the component created in Task 3.

---

## Task 1: Add the per-content-type preferences to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Replace the `preferences` array**

In `package.json`, replace the entire `preferences` array with the following. This adds five new dropdowns (`videoMediaType`, `videoQuality`, `videoContainer`, `audioFormat`, `webpageSaveMode`), retitles `downloadPath` and `cookiesFromBrowser`, and reorders every entry so the flat list reads as grouped. Existing `name`, `type`, `default`, and `data` fields are unchanged — only `title` and array order change.

```json
"preferences": [
  {
    "name": "downloadPath",
    "title": "Download Folder",
    "description": "Path to download video",
    "type": "directory",
    "default": "~/Downloads",
    "required": true
  },
  {
    "name": "videoMediaType",
    "title": "Video: Media Type",
    "description": "Default for video URLs: download the full video, or extract audio only.",
    "type": "dropdown",
    "default": "video",
    "required": false,
    "data": [
      { "title": "Video", "value": "video" },
      { "title": "Audio Only", "value": "audio" }
    ]
  },
  {
    "name": "videoQuality",
    "title": "Video: Quality",
    "description": "Default video resolution. Ignored when Media Type is Audio Only.",
    "type": "dropdown",
    "default": "best",
    "required": false,
    "data": [
      { "title": "Best Available", "value": "best" },
      { "title": "1080p", "value": "1080" },
      { "title": "720p", "value": "720" },
      { "title": "480p", "value": "480" },
      { "title": "Smallest File", "value": "smallest" }
    ]
  },
  {
    "name": "videoContainer",
    "title": "Video: Container",
    "description": "Default container for downloaded video. Ignored when Media Type is Audio Only.",
    "type": "dropdown",
    "default": "mp4",
    "required": false,
    "data": [
      { "title": "MP4", "value": "mp4" },
      { "title": "MKV", "value": "mkv" },
      { "title": "WebM", "value": "webm" }
    ]
  },
  {
    "name": "audioFormat",
    "title": "Video: Audio Format",
    "description": "Default audio format when Media Type is Audio Only.",
    "type": "dropdown",
    "default": "mp3",
    "required": false,
    "data": [
      { "title": "MP3", "value": "mp3" },
      { "title": "M4A", "value": "m4a" },
      { "title": "Opus", "value": "opus" }
    ]
  },
  {
    "name": "webpageSaveMode",
    "title": "Webpage: Save Mode",
    "description": "Default for saved webpages (used by a later release). Complete embeds everything; Lightweight strips JavaScript.",
    "type": "dropdown",
    "default": "complete",
    "required": false,
    "data": [
      { "title": "Complete", "value": "complete" },
      { "title": "Lightweight (no JavaScript)", "value": "lightweight" }
    ]
  },
  {
    "name": "autoLoadUrlFromClipboard",
    "title": "Auto Load URL from Clipboard",
    "description": "Automatically load the URL from the clipboard when the command is executed",
    "type": "checkbox",
    "label": "Enable",
    "default": false,
    "required": false
  },
  {
    "name": "autoLoadUrlFromSelectedText",
    "title": "Auto Load URL from Selected Text",
    "description": "Automatically load the URL from the selected text when the command is executed",
    "type": "checkbox",
    "label": "Enable",
    "default": false,
    "required": false
  },
  {
    "name": "enableBrowserExtensionSupport",
    "title": "Enable Browser Extension Support",
    "description": "Enable browser extension support for reading video URLs from the browser",
    "type": "checkbox",
    "label": "Enable",
    "default": false,
    "required": false
  },
  {
    "name": "cookiesFromBrowser",
    "title": "Gallery: Cookies from Browser",
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
  },
  {
    "name": "homebrewPath",
    "title": "Homebrew Path",
    "description": "Path to the Homebrew executable. You can enter `which brew` to terminal to find its path.",
    "type": "textfield",
    "default": "/opt/homebrew/bin/brew",
    "required": false
  },
  {
    "name": "ytdlPath",
    "title": "yt-dlp Path",
    "description": "Path to the yt-dlp executable. You can enter `which yt-dlp` to terminal to find its path.",
    "type": "textfield",
    "required": false
  },
  {
    "name": "ffmpegPath",
    "title": "ffmpeg Path",
    "description": "Path to the ffmpeg executable. You can enter `which ffmpeg` to terminal to find its path.",
    "type": "textfield",
    "required": false
  },
  {
    "name": "ffprobePath",
    "title": "ffprobe Path",
    "description": "Path to the ffprobe executable. Usually installed along with ffmpeg. You can enter `which ffprobe` to terminal to find its path.",
    "type": "textfield",
    "required": false
  },
  {
    "name": "galleryDlPath",
    "title": "gallery-dl Path",
    "description": "Path to the gallery-dl executable. Run `which gallery-dl` to find it.",
    "type": "textfield",
    "required": false
  },
  {
    "name": "forceIpv4",
    "title": "Force IPv4 (Experimental)",
    "description": "Force IPv4 for network requests, this can be useful if you have some network issues. But this should be a temporary solution. We might remove this option in the future.",
    "type": "checkbox",
    "label": "Enable",
    "default": false,
    "required": false
  }
]
```

- [ ] **Step 2: Regenerate the preference types and verify the build**

Run: `npm run build`
Expected: builds with no type errors. `ray build` validates the manifest and regenerates `raycast-env.d.ts` so `ExtensionPreferences` now includes `videoMediaType`, `videoQuality`, `videoContainer`, `audioFormat`, and `webpageSaveMode`.

- [ ] **Step 3: Commit**

`raycast-env.d.ts` is generated and gitignored — commit only `package.json`.

```bash
git add package.json
git commit -m "Add per-content-type download default preferences"
```

---

## Task 2: src/lib/config.ts — typed config + videoFormatSelector

**Files:**
- Create: `src/lib/config.ts`, `tests/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/config.test.ts`. `config.ts` imports `getPreferenceValues` from `@raycast/api`, which cannot load in vitest's node environment — so the test mocks `@raycast/api`. Only the pure `videoFormatSelector` is exercised; `getConfig` is verified by the build.

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({}) }));

import { videoFormatSelector } from "../src/lib/config";

describe("videoFormatSelector", () => {
  it("maps 'best' to an uncapped selector", () => {
    expect(videoFormatSelector("best")).toBe("bestvideo+bestaudio/best");
  });

  it("maps '1080' to a 1080-capped selector", () => {
    expect(videoFormatSelector("1080")).toBe(
      "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
    );
  });

  it("maps '720' to a 720-capped selector", () => {
    expect(videoFormatSelector("720")).toBe(
      "bestvideo[height<=720]+bestaudio/best[height<=720]",
    );
  });

  it("maps '480' to a 480-capped selector", () => {
    expect(videoFormatSelector("480")).toBe(
      "bestvideo[height<=480]+bestaudio/best[height<=480]",
    );
  });

  it("maps 'smallest' to a worst-quality selector", () => {
    expect(videoFormatSelector("smallest")).toBe("worstvideo+worstaudio/worst");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- config`
Expected: FAIL — cannot find module `../src/lib/config`.

- [ ] **Step 3: Implement src/lib/config.ts**

Create `src/lib/config.ts`:

```typescript
import { getPreferenceValues } from "@raycast/api";

export type VideoMediaType = "video" | "audio";

/** Per-content-type download defaults, read from extension preferences. */
export type DownloaderConfig = {
  videoMediaType: VideoMediaType;
  videoQuality: string;
  videoContainer: string;
  audioFormat: string;
  webpageSaveMode: string;
};

/** Read the per-content-type download defaults from extension preferences. */
export function getConfig(): DownloaderConfig {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  return {
    videoMediaType: prefs.videoMediaType as VideoMediaType,
    videoQuality: prefs.videoQuality,
    videoContainer: prefs.videoContainer,
    audioFormat: prefs.audioFormat,
    webpageSaveMode: prefs.webpageSaveMode,
  };
}

/**
 * Map a generic video-quality token (the `videoQuality` preference) to a
 * yt-dlp `-f` format selector string. Any unrecognised token resolves to the
 * uncapped best-quality selector.
 */
export function videoFormatSelector(quality: string): string {
  if (quality === "smallest") {
    return "worstvideo+worstaudio/worst";
  }
  if (quality === "1080" || quality === "720" || quality === "480") {
    return `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`;
  }
  return "bestvideo+bestaudio/best";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- config`
Expected: PASS — 5 passed.

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: builds with no type errors. (`config.ts` is not imported anywhere yet — Sections 2 and 4 consume it later — but `ray build` compiles it, so this confirms it is type-clean.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/config.ts tests/config.test.ts
git commit -m "Add lib/config.ts download-defaults module"
```

---

## Task 3: src/views/onboarding.tsx — the first-run onboarding view

**Files:**
- Create: `src/views/onboarding.tsx`

- [ ] **Step 1: Implement the onboarding view**

Create `src/views/onboarding.tsx`. It is a `Detail` with one prop, `onComplete`. It detects the four CLI tools via the existing `utils.ts` path helpers + `fs.existsSync`, renders a welcome + checklist, and offers an install action for any missing tools. It does **not** write the onboarding flag itself — the caller decides what "complete" means (see Tasks 4 and 5).

```typescript
import { useMemo, useState } from "react";
import fs from "node:fs";
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { execa } from "execa";
import {
  downloadPath,
  getGalleryDlPath,
  getWingetPath,
  getffmpegPath,
  getffprobePath,
  getytdlPath,
  homebrewPath,
  isMac,
} from "../utils.js";

type ToolStatus = { name: string; path: string; installed: boolean };

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);

  const tools = useMemo<ToolStatus[]>(
    () =>
      [
        { name: "yt-dlp", path: getytdlPath() },
        { name: "ffmpeg", path: getffmpegPath() },
        { name: "ffprobe", path: getffprobePath() },
        { name: "gallery-dl", path: getGalleryDlPath() },
      ].map((t) => ({ ...t, installed: fs.existsSync(t.path) })),
    [refreshKey],
  );

  const missing = tools.filter((t) => !t.installed);

  const checklist = tools
    .map((t) => `- ${t.installed ? "✅" : "❌"} ${t.name} — ${t.installed ? "installed" : "not found"}`)
    .join("\n");

  const markdown = `# Welcome to The Downloader

Download video, audio, image galleries, and YouTube transcripts — all from one command. Webpage saving arrives in a later release.

## Required tools

The Downloader drives the yt-dlp and gallery-dl command-line tools:

${checklist}

## You're set

Downloads are saved to \`${downloadPath}\`. Quality and format defaults live in extension settings — open them to adjust, or keep the defaults.

Choose **Finish Setup** when you're ready.
`;

  async function installMissing() {
    if (isInstalling || missing.length === 0) return;
    setIsInstalling(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Installing tools…" });
    try {
      if (isMac) {
        await execa(homebrewPath, ["install", ...missing.map((t) => t.name)]);
      } else {
        const wingetPath = await getWingetPath();
        await execa(wingetPath, [
          "install",
          "--accept-source-agreements",
          "--accept-package-agreements",
          "--id=yt-dlp.yt-dlp",
          "-e",
        ]);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Tools installed";
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Installation failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsInstalling(false);
    }
  }

  return (
    <Detail
      isLoading={isInstalling}
      navigationTitle="Setup"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Finish Setup" icon={Icon.Check} onAction={onComplete} />
          {missing.length > 0 && (
            <Action title="Install Missing Tools" icon={Icon.Download} onAction={installMissing} />
          )}
          <Action title="Open Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: builds with no type errors. (`onboarding.tsx` is not imported yet — Tasks 4 and 5 wire it in — but `ray build` compiles it, confirming it is type-clean.)

- [ ] **Step 3: Commit**

```bash
git add src/views/onboarding.tsx
git commit -m "Add views/onboarding.tsx first-run onboarding"
```

---

## Task 4: src/index.tsx — gate the first run on onboarding

**Files:**
- Modify: `src/index.tsx`

- [ ] **Step 1: Replace src/index.tsx with the onboarding-gated router**

Replace the entire contents of `src/index.tsx` with the following. Changes from the current file: the startup effect also reads a `LocalStorage` flag; a `showOnboarding` state renders `<Onboarding>` on first run; the loading placeholder becomes `<Detail isLoading />` (was `<Form isLoading />`); `autoLoadDone` is renamed `startupDone` since it now also covers the flag read.

```typescript
import { useEffect, useState } from "react";
import { BrowserExtension, Clipboard, Detail, getPreferenceValues, getSelectedText, LocalStorage } from "@raycast/api";
import { detectSource } from "./lib/detect.js";
import { SourceType } from "./types.js";
import { isValidUrl } from "./utils.js";
import { VideoForm } from "./views/video-form.js";
import { GalleryForm } from "./views/gallery-form.js";
import { Onboarding } from "./views/onboarding.js";

const { autoLoadUrlFromClipboard, autoLoadUrlFromSelectedText, enableBrowserExtensionSupport } =
  getPreferenceValues<ExtensionPreferences>();

const ONBOARDING_KEY = "hasCompletedOnboarding";

export default function Command() {
  const [url, setUrl] = useState("");
  const [type, setType] = useState<SourceType>("video");
  const [typeTouched, setTypeTouched] = useState(false);
  const [startupDone, setStartupDone] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const onboarded = await LocalStorage.getItem<string>(ONBOARDING_KEY);
        if (!onboarded) setShowOnboarding(true);
      } catch {
        /* storage unavailable — skip onboarding rather than block the user */
      }

      let loaded = "";
      if (autoLoadUrlFromClipboard) {
        const text = await Clipboard.readText();
        if (text && isValidUrl(text)) loaded = text;
      }
      if (!loaded && autoLoadUrlFromSelectedText) {
        try {
          const text = await getSelectedText();
          if (text && isValidUrl(text)) loaded = text;
        } catch {
          /* no selection */
        }
      }
      if (!loaded && enableBrowserExtensionSupport) {
        try {
          const tab = (await BrowserExtension.getTabs()).find((t) => t.active)?.url;
          if (tab && isValidUrl(tab)) loaded = tab;
        } catch {
          /* no browser extension */
        }
      }
      if (loaded) {
        setUrl(loaded);
        if (!typeTouched) setType(detectSource(loaded));
      }
      setStartupDone(true);
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

  async function handleOnboardingComplete() {
    await LocalStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  }

  if (!startupDone) return <Detail isLoading />;

  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  return type === "gallery" ? (
    <GalleryForm url={url} typeValue={type} onTypeChange={handleTypeChange} onUrlChange={handleUrlChange} />
  ) : (
    <VideoForm url={url} onUrlChange={handleUrlChange} typeValue={type} onTypeChange={handleTypeChange} />
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: builds with no type errors.

- [ ] **Step 3: Verify in dev mode**

Run `npm run dev`, then open the Download command. On a freshly built dev extension (no `hasCompletedOnboarding` value stored) the onboarding view appears, showing the tool checklist. Press "Finish Setup" → the normal Download form renders. Close and reopen the command → it goes straight to the form, with no onboarding.

- [ ] **Step 4: Commit**

```bash
git add src/index.tsx
git commit -m "Gate first run on onboarding in index.tsx"
```

---

## Task 5: src/views/video-form.tsx — add the "Setup & Tools" action

**Files:**
- Modify: `src/views/video-form.tsx`

- [ ] **Step 1: Add `useNavigation` to the @raycast/api import**

In `src/views/video-form.tsx`, the import block currently reads:

```typescript
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
```

Replace it with (adds `useNavigation`):

```typescript
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
```

- [ ] **Step 2: Import the Onboarding component**

The import block currently ends with:

```typescript
import Installer from "./installer.js";
import Updater from "./updater.js";
```

Replace it with:

```typescript
import Installer from "./installer.js";
import Updater from "./updater.js";
import { Onboarding } from "./onboarding.js";
```

- [ ] **Step 3: Capture the navigation `pop` function**

The component currently starts:

```typescript
export function VideoForm({ url, onUrlChange, typeValue, onTypeChange }: VideoFormProps) {
  const [error, setError] = useState(0);
  const [warning, setWarning] = useState("");
```

Replace that with:

```typescript
export function VideoForm({ url, onUrlChange, typeValue, onTypeChange }: VideoFormProps) {
  const [error, setError] = useState(0);
  const [warning, setWarning] = useState("");
  const { pop } = useNavigation();
```

- [ ] **Step 4: Add the "Setup & Tools" action**

The second `ActionPanel.Section` currently reads:

```typescript
          <ActionPanel.Section>
            <Action.Push icon={Icon.Hammer} title="Update Libraries" target={<Updater />} />
          </ActionPanel.Section>
```

Replace it with:

```typescript
          <ActionPanel.Section>
            <Action.Push icon={Icon.Hammer} title="Update Libraries" target={<Updater />} />
            <Action.Push icon={Icon.Gear} title="Setup & Tools" target={<Onboarding onComplete={pop} />} />
          </ActionPanel.Section>
```

When onboarding is reached this way, "Finish Setup" calls `pop`, which pops the pushed view back to the form. The onboarding flag is untouched (it was already set on first run).

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: builds with no type errors.

- [ ] **Step 6: Verify in dev mode**

Run `npm run dev`, open the Download command (past onboarding, on the video form), open the action panel, and trigger "Setup & Tools" — the onboarding view pushes onto the stack. "Finish Setup" pops back to the form.

- [ ] **Step 7: Commit**

```bash
git add src/views/video-form.tsx
git commit -m "Add Setup & Tools action to the video form"
```

---

## Final Verification

After all tasks, run the full check:

- [ ] `npm test` — all unit tests pass (binary, detect, gallerydl, config).
- [ ] `npm run build` — no type errors.
- [ ] `npm run lint` — no errors. If it reports formatting issues, run `npm run fix-lint`, then commit the result with `git commit -m "Apply Prettier formatting"`.
- [ ] `npm run dev` manual pass:
  - With a freshly built dev extension, the Download command opens onto the onboarding view; the tool checklist matches what is actually installed.
  - "Open Settings" opens extension preferences; the five new dropdowns appear, grouped by title prefix and ordered, each showing its default.
  - With a tool uninstalled, the checklist marks it missing and "Install Missing Tools" appears and installs it.
  - "Finish Setup" → reopening the command goes straight to the form, with no onboarding.
  - "Setup & Tools" on the video form pushes onboarding; "Finish Setup" pops back.
  - The video and gallery download flows still behave exactly as before.

When green, Section 1 is complete and `feature/settings-onboarding` is ready to merge into `develop`.
