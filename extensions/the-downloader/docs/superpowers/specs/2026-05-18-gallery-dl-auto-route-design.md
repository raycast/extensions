# Phase 2 — gallery-dl + Auto-Route

**Date:** 2026-05-18
**Status:** Design — awaiting review
**Branch:** `feature/gallery-dl-auto-route`

## Context

The Downloader is a Raycast extension, forked from the Video Downloader extension
(a yt-dlp video/audio downloader). The macro plan is to grow it into a content
**acquisition + conversion** tool. Phase 1 (yt-dlp video/audio — the renamed fork)
is done.

This is **Phase 2**: add image-gallery downloads via `gallery-dl`, restructure the
single command into an auto-routing `Download` command, and surface the extension's
existing transcript capability as a user-facing output.

## Goals

- One `Download` command: paste any URL, it routes to yt-dlp (video) or gallery-dl
  (gallery) automatically.
- A user can get a YouTube video's full transcript as a first-class output option.
- The codebase is restructured so later phases (monolith, etc.) slot in cleanly.

## Non-goals (explicitly out of scope)

- faster-whisper / audio transcription.
- markitdown / document conversion.
- monolith / webpage saving (a later phase).
- Download history.
- Changes to the AI tools in `src/tools/` — they stay video-only.

## Architecture — the command becomes a router

The `Download` command (`src/index.tsx`) becomes a thin router. Today's ~335-line
yt-dlp form body is extracted into `views/video-form.tsx`. `index.tsx` then only:
holds the URL state + auto-load, runs source detection, and renders the typed form.
Net effect: `index.tsx` shrinks, the yt-dlp logic is isolated, and gallery is a
sibling rather than a conditional branch inside a large file.

File structure after this phase:

```
src/
  index.tsx          router: URL state, auto-load, detect -> render typed form
  lib/
    detect.ts        detectSource(url): "video" | "gallery"
    binary.ts        resolveBinary(name, prefPath)
    ytdlp.ts         yt-dlp: metadata, arg-building, spawn, progress parsing
    gallerydl.ts     gallery-dl: arg-building, spawn, progress parsing
  views/
    video-form.tsx   yt-dlp Form (extracted) + transcript output option
    gallery-form.tsx gallery-dl Form (new)
    installer.tsx    tool-aware
    updater.tsx      tool-aware
  utils.ts           trimmed: format/string helpers remain; binary resolution removed
  types.ts           Video/Format types + new SourceType
  transcript.ts      aligned to lib/ (caption download + SRT cleanup)
  tools/             AI tools, video-only; imports updated to lib/
```

## Components

- **`lib/binary.ts`** — `resolveBinary(name, prefPath?)`: returns the preference
  path if it exists, else the default Homebrew path. Replaces the three
  near-duplicate `getytdlPath`/`getffmpegPath`/`getffprobePath` functions and adds
  `gallery-dl`. Pure, unit-testable.
- **`lib/detect.ts`** — `detectSource(url): SourceType`. Domain map: video domains
  (youtube, youtu.be, twitch, vimeo, tiktok, x/twitter, bilibili, …) -> `"video"`;
  gallery domains (reddit, imgur, pixiv, deviantart, flickr, danbooru, artstation,
  pinterest, …) -> `"gallery"`. Unknown domain -> default `"video"` (yt-dlp's
  generic extractor is broad). Pure, unit-testable.
- **`lib/ytdlp.ts`** — yt-dlp operations: `fetchVideo(url)` (`--dump-json` ->
  `Video`), download arg-building, spawn with a progress callback. Extracted from
  `index.tsx` and `tools/download-video.ts` so both consume the same module.
- **`lib/gallerydl.ts`** — gallery-dl operations: gallery arg-building, spawn with a
  per-file progress callback. New.
- **`views/video-form.tsx`** — the yt-dlp Form, extracted from today's `index.tsx`
  near-verbatim. The Format dropdown gains a "Transcript" output. Submit branches:
  media download vs transcript extraction.
- **`views/gallery-form.tsx`** — gallery-dl Form (new). URL (from router),
  destination (the `downloadPath` preference). The cookies-from-browser
  preference is applied to the gallery-dl command.
- **`index.tsx`** — router. URL state + auto-load (clipboard / selected text /
  browser extension, exactly as today). A Type dropdown auto-set by `detectSource()`
  and user-overridable. Renders `video-form` or `gallery-form`.
- **`installer.tsx` / `updater.tsx`** — operate on the specific missing/checked tool
  (yt-dlp, ffmpeg, ffprobe, gallery-dl) instead of hardcoding `yt-dlp ffmpeg`.

## Data flow

1. Command opens -> `index.tsx` auto-loads a URL (clipboard / selected text /
   browser extension).
2. On URL change -> `detectSource(url)` sets the Type; the user may override it via
   the Type dropdown.
3. The router renders `video-form` or `gallery-form` with the URL.
4. **Video:** `video-form` fetches metadata, shows the Format dropdown (video
   qualities + mp3 + Transcript). On submit:
   - media format -> yt-dlp download -> file in `downloadPath`, progress toast.
   - Transcript -> `transcript.ts` -> `<title>.txt` in `downloadPath`, toast with
     Copy + Open actions.
5. **Gallery:** `gallery-form` submit -> gallery-dl download -> files in
   `downloadPath`/<per-site subfolders>, "Downloaded N files" toast.
6. A missing tool at any point -> the `Installer` for that specific tool.

## Auto-route detail

- Detection runs on the URL value, domain-map based — instant, no subprocess.
- The Type dropdown shows the detected value but is editable. Detection is a soft
  default, not a gate; a wrong guess is one click to fix.
- Unknown domain -> default `"video"`.

## Transcript output option

- In `video-form`'s Format dropdown, a new item: **"Transcript (.txt)"**.
- Selecting it + submit -> runs `extractTranscript(url, language)` (the existing
  logic in `transcript.ts`), writes `<sanitized title>.txt` to `downloadPath`.
- Success toast offers **Open** and **Copy Transcript** actions.
- Caption-based: it pulls YouTube's transcript / auto-captions (yt-dlp
  `--write-subs` / `--write-auto-subs`). Not audio transcription. If the video has
  no captions -> a clear "no transcript available" toast.
- Language: defaults to `"en"` for v1 (keep minimal; no language field yet).

## gallery-dl integration detail

- Command: `gallery-dl -d <downloadPath> [--cookies-from-browser <browser>] <url>`.
- `-d` (base destination) so gallery-dl organizes downloads into per-site/album
  subfolders.
- Progress: gallery-dl prints each downloaded file path to stdout -> count lines ->
  toast "Downloaded N files".
- Cookies: optional, for login-gated sites (Instagram, Pixiv, X). Exposed as a
  preference dropdown (None / Safari / Chrome / Firefox / Brave / Edge).
- Done -> success toast + "Open Folder". Non-zero exit -> failure toast with stderr.

## Targeted refactors bundled in

The skill's principle — improve code we are already working in:

- Extract `lib/binary.ts` — removes 3 duplicate path functions from `utils.ts`.
- Extract `lib/ytdlp.ts` — yt-dlp logic out of the 335-line `index.tsx`, shared with
  `tools/download-video.ts`.
- Generic `installer.tsx` / `updater.tsx` — a tool list instead of hardcoded tools.
- `index.tsx` slims to a router.
- *Not* in scope: splitting the format/string helpers out of `utils.ts` — unrelated.

## package.json changes

- Command stays a single command (`index`, title "Download").
- New preferences: `gallery-dl Path` (textfield, optional, auto-detected), `Cookies
  from Browser` (dropdown, default None).
- Update the `Download` command `description` (currently "Download video with
  parameters").

## Error handling

- Tool not installed -> `Installer` for that specific tool.
- Invalid / empty URL -> form validation error.
- Tool exits non-zero -> failure toast with truncated stderr + copy-error action.
- Video has no captions (Transcript option) -> clear "no transcript available" toast.
- Live streams -> the existing guard stays.

## Testing

- **Unit:** `lib/detect.ts` (domain -> type), `lib/binary.ts` (path resolution),
  arg-builders in `lib/ytdlp.ts` and `lib/gallerydl.ts`.
- **Manual:** a real YouTube video (download + transcript) and a real gallery URL
  (e.g. a subreddit or imgur album). Requires `brew install gallery-dl`.
- **Dev mode:** `npm run dev` — verify auto-route picks the right form and the
  Transcript option produces a `.txt`.

## Indicative build sequence

1. Extract `lib/binary.ts`; update `utils.ts` / `index.tsx` / `transcript.ts` /
   `tools/` to use it.
2. Extract `lib/ytdlp.ts`; `index.tsx` and `tools/` consume it.
3. Extract today's form body into `views/video-form.tsx`.
4. Add `lib/detect.ts` and the router logic + Type dropdown in `index.tsx`.
5. Add `lib/gallerydl.ts` and `views/gallery-form.tsx`.
6. Make `installer.tsx` / `updater.tsx` tool-aware.
7. Add the Transcript output option to `video-form.tsx`.
8. `package.json`: gallery-dl path + cookies preferences.

The detailed implementation plan (with checkpoints) will be produced from this spec.
