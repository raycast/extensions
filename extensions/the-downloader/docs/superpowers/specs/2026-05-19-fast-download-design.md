# Section 2 — Fast Download

**Date:** 2026-05-19
**Status:** Design — awaiting review
**Branch:** `main`

## Context

The Downloader is a Raycast extension that downloads video/audio (yt-dlp), image
galleries (gallery-dl), and Spotify music (spotDL) from a single auto-routing
`Download` **view** command. Section 1 (Settings & Onboarding) added a typed
download-defaults layer — `lib/config.ts` (`getConfig()`) and `lib/video-format.ts`
(`videoFormatSelector()`) — that no command consumes yet.

This is **Section 2** of `docs/superpowers/macroplan.md`: **Fast Download** — a new
argument-driven command that downloads a pasted URL instantly, with no form,
reading every choice from the Section 1 preferences. It is the first consumer of
the Section 1 configuration layer.

## Goals

- A new `no-view` command, **Fast Download**, with one required `url` text
  argument (Raycast's inline root-search "pill").
- Paste a URL, press Enter → it auto-routes via `detectSource` and downloads with
  no form, using the Section 1 download defaults.
- Live progress feedback and a success/failure result, via Toast.
- Routes video → yt-dlp, gallery → gallery-dl, Spotify → spotDL on day one.
- The pure logic added is covered by unit tests.

## Non-goals (explicitly out of scope)

- **Per-invocation format/quality choice.** Resolved in the brainstorm: Fast
  Download takes **only** the `url` argument. Media type, quality, container,
  audio format, and destination all come from the Section 1 preferences.
  Per-download choices remain the job of the `Download` command (and Section 4's
  redesigned form).
- Changing the `Download` view command's behavior, beyond one small additive
  change: reading `launchContext` so the missing-tool hand-off can pre-fill the
  URL (see Components → `index.tsx`).
- Retrofitting `views/video-form.tsx` onto the new `runVideoDownload` runner —
  that is part of Section 4's form overhaul. The form keeps its current inline
  `spawn`.
- monolith / `webpage` saving — Section 3. The routing is structured so a
  `"webpage"` route is a one-branch addition later.
- Download history, a menu-bar command, and AI tools — `src/tools/` is unchanged.
- Clipboard / selected-text / browser auto-load. The `url` argument is
  `required`, so Fast Download always receives its URL; the existing auto-load
  preferences stay specific to the `Download` command.

## How a Raycast command is "prompted" — the mechanism

A Raycast extension exposes capability through **commands** (run from root search)
and **AI tools** (the `tools` array, invoked by the Raycast AI from a natural-
language prompt). The Downloader already has two AI tools; Fast Download does not
touch them — it is a *command*.

A command can declare **arguments**: up to three fields Raycast prompts for inline
in root search *before* the command runs. Each argument has a `name`, a `type`
(`text` / `password` / `dropdown`), a `placeholder`, and an optional `required`
flag. **Arguments have no default values** — that is a *preference* feature. A
command receives them type-safely via `LaunchProps<{ arguments: Arguments.<Name> }>`,
where `Arguments` is a TypeScript namespace generated from the manifest.

A `no-view` command exports a `default async function`; Raycast runs it and unloads
the command once the returned promise settles. Because the function can `await`,
a full download runs to completion inside it.

## Architecture

```
src/
  fast-download.ts   NEW — the no-view command: parse arg, route, run, report
  index.tsx          MODIFIED — reads launchContext.url (missing-tool hand-off target)
  lib/
    detect.ts        (unchanged) — detectSource() already returns video|gallery|spotify
    config.ts        (unchanged) — getConfig() supplies the download defaults
    video-format.ts  MODIFIED — adds composeVideoFormat() (pure)
    ytdlp.ts         MODIFIED — generalises buildVideoDownloadArgs() audio branch;
                                adds runVideoDownload() (awaitable, progress-parsing)
    gallerydl.ts     (unchanged) — runGalleryDownload() reused as-is
    spotdl.ts        (unchanged) — runSpotdlDownload() reused as-is
  utils.ts           (unchanged) — path resolvers + isValidUrl reused
tests/
  ytdlp.test.ts      NEW — buildVideoDownloadArgs (audio branch) + runVideoDownload
  video-format.test.ts  MODIFIED — adds composeVideoFormat cases
package.json         MODIFIED — the fast-download command entry
README.md            MODIFIED — document the Fast Download command
CHANGELOG.md         MODIFIED — add a Fast Download release entry
```

## Components

### `package.json` (modified)

Add a second entry to the `commands` array, after `index`:

```json
{
  "name": "fast-download",
  "title": "Fast Download",
  "subtitle": "The Downloader",
  "description": "Paste a URL and download it instantly using your saved defaults — no form.",
  "mode": "no-view",
  "keywords": ["quick", "instant", "paste"],
  "arguments": [
    { "name": "url", "type": "text", "placeholder": "URL", "required": true }
  ]
}
```

`name: "fast-download"` maps to the entry file `src/fast-download.ts`. `ray build`
regenerates `raycast-env.d.ts` (generated, gitignored) with
`Arguments.FastDownload = { url: string }`.

### `src/fast-download.ts` (new) — the command

A `default async function` typed
`(props: LaunchProps<{ arguments: Arguments.FastDownload }>)`. It owns the Raycast
surface (Toast, `launchCommand`); the `lib/` modules stay UI-free. Flow:

1. `const { url } = props.arguments`. If `!isValidUrl(url)` → a Failure toast
   ("Invalid URL"), return.
2. `const type = detectSource(url)` → `"video" | "gallery" | "spotify"`.
3. Resolve the tool paths (`getytdlPath`, `getffmpegPath`, `getffprobePath`,
   `getDenoPath`, `getGalleryDlPath`, `getSpotdlPath` from `utils.ts`), `getConfig()`,
   and `downloadPath`. Determine the **required tools** for `type` (below) and
   check each with `fs.existsSync`. If any is missing → the missing-tool hand-off
   for the first absent tool (see "Missing-tool handling"), return.
4. Show an animated Toast (`Downloading…`, message `0%` / `0 files` / `0 tracks`).
5. Dispatch on `type`:
   - **video** — `format = composeVideoFormat({ mediaType, quality, container, audioFormat })`
     from config; `outputTemplate = path.join(downloadPath, "%(title)s (%(id)s).%(ext)s")`;
     `await runVideoDownload(ytdlPath, { url, format, outputTemplate, ffmpegPath, denoPath }, pct => toast.message = \`${pct}%\`)`.
     `denoPath` is passed only when `fs.existsSync(denoPath)`, matching `video-form.tsx`.
   - **gallery** — `await runGalleryDownload(galleryDlPath, { url, destination: downloadPath, cookiesFromBrowser: cookiesFromBrowser || undefined }, p => toast.message = \`${p.files} files\`)`.
   - **spotify** — `await runSpotdlDownload(spotdlPath, { url, destination: downloadPath, format: spotifyAudioFormat, ffmpegPath }, p => toast.message = \`${p.tracks} tracks\`)`.
6. On success → the Toast turns green: title "Downloaded", message = the file
   name (video) or `N files` / `N tracks`; `primaryAction` "Open Folder" —
   `path.dirname(filePath)` for video (falling back to `downloadPath` if no path
   was captured), `downloadPath` for gallery and Spotify. For video, a
   `secondaryAction` "Copy to Clipboard" of the file (mirrors the video form).
7. On a rejected runner → a Failure toast: title "Download Failed", message = the
   error text, `primaryAction` "Copy to Clipboard".

No metadata pre-fetch — yt-dlp fills `%(title)s` in the output template itself, so
the download starts immediately. This is what makes it "fast".

The `switch (type)` has three branches today; Section 3's `"webpage"` route is one
more branch.

### `src/lib/ytdlp.ts` (modified)

Two changes, both keep the module `@raycast/api`-free (today it transitively imports
`@raycast/api` via `MP3_FORMAT_ID` from `utils.ts`; change 1 removes that import,
making the module unit-testable):

1. **Generalise the `buildVideoDownloadArgs` audio branch.** Today it special-cases
   the exact string `MP3_FORMAT_ID` (`"bestaudio#mp3"`) and hard-codes
   `--audio-format mp3`. Replace the condition with a check on the *download-format*
   half of the `"<downloadFormat>#<recodeFormat>"` pair:

   ```ts
   const [downloadFormat, recodeFormat] = a.format.split("#");
   if (downloadFormat === "bestaudio") {
     args.push("--extract-audio", "--audio-format", recodeFormat, "--audio-quality", "0");
   } else {
     args.push("--format", downloadFormat, "--recode-video", recodeFormat);
   }
   ```

   This is **behaviour-preserving** for the existing `Download` form: its mp3 option
   produces `"bestaudio#mp3"` (`downloadFormat === "bestaudio"` → unchanged), and its
   other audio-only formats produce `"<id>#<ext>"` (`downloadFormat !== "bestaudio"`
   → still the recode path). It additionally lets Fast Download request `m4a` / `opus`
   via `"bestaudio#m4a"` / `"bestaudio#opus"`. Delete the now-unused
   `import { MP3_FORMAT_ID } from "../utils.js"`. (The `MP3_FORMAT_ID` constant in
   `utils.ts` becomes unused; removing it is a harmless optional cleanup, not on the
   critical path.)

2. **Add `runVideoDownload`** — a promise-returning, progress-parsing runner that
   mirrors `runGalleryDownload` / `runSpotdlDownload`. The `Download` form spawns
   yt-dlp inline and never awaits process close (the form view stays mounted); a
   no-view command must await completion, so it needs an awaitable runner.

   ```ts
   export function runVideoDownload(
     binaryPath: string,
     options: VideoDownloadArgs,
     onProgress: (percent: number) => void,
   ): Promise<{ filePath: string }>
   ```

   It `spawn`s `binaryPath` with `buildVideoDownloadArgs(options)` and
   `env: { ...process.env, PYTHONUNBUFFERED: "1" }`. From **stdout** it parses
   `[download]\s+(\d+(\.\d+)?)%` lines → `onProgress`, and captures absolute-path
   lines (the `--print after_move:filepath` output: `line.startsWith("/")` on macOS,
   a drive-letter match on Windows) → `filePath`. It accumulates **stderr**. On
   `close` code 0 it resolves `{ filePath }`; on a non-zero code it rejects with
   `new Error(stderr.trim() || "yt-dlp exited with code <code>")`; on `error` it
   rejects. This parsing matches what `video-form.tsx` does inline today.

### `src/lib/video-format.ts` (modified)

Add a pure helper next to `videoFormatSelector` — the seam that maps the Section 1
config to a yt-dlp format string for `buildVideoDownloadArgs`:

```ts
export function composeVideoFormat(o: {
  mediaType: "video" | "audio";
  quality: string;
  container: string;
  audioFormat: string;
}): string {
  if (o.mediaType === "audio") return `bestaudio#${o.audioFormat}`;
  return `${videoFormatSelector(o.quality)}#${o.container}`;
}
```

Examples: `{video, best, mp4}` → `"bestvideo+bestaudio/best#mp4"`;
`{video, 1080, mkv}` → `"bestvideo[height<=1080]+bestaudio/best[height<=1080]#mkv"`;
`{audio, _, _, opus}` → `"bestaudio#opus"`. It takes primitives (not `DownloaderConfig`)
so `video-format.ts` keeps no dependency on `config.ts`.

### `src/index.tsx` (modified)

A small additive change so the missing-tool hand-off can carry the URL. Change the
signature to `export default function Command(props: LaunchProps)` and, in the
existing startup `useEffect`, read `props.launchContext` as the **highest-priority**
URL source — before clipboard / selected text / browser. Implementation: a local
cast, `const ctxUrl = (props.launchContext as { url?: string } | undefined)?.url;`,
and if `ctxUrl && isValidUrl(ctxUrl)` use it as `loaded` and skip the other sources.
Everything else in `index.tsx` is unchanged.

## Data flow — a Fast Download of a video

1. The user selects **Fast Download** in root search; Raycast shows the `url`
   argument field. They paste a URL and press Enter.
2. `src/fast-download.ts` runs. `url = props.arguments.url`; `isValidUrl` passes.
3. `detectSource(url)` → `"video"`. Required tools: yt-dlp, ffmpeg, ffprobe, deno
   — all present.
4. `composeVideoFormat` turns the config into a format string;
   `runVideoDownload` spawns yt-dlp with an output template under `downloadPath`.
5. An animated Toast shows `12%`, `47%`, … as `onProgress` fires.
6. yt-dlp exits 0; the runner resolves `{ filePath }`. The Toast turns green —
   "Downloaded", the file name, **Open Folder** + **Copy to Clipboard**.

Gallery and Spotify follow the same shape via `runGalleryDownload` /
`runSpotdlDownload`, reporting `N files` / `N tracks`.

## Missing-tool handling

The required tools per route:

| Route   | Required tools                       |
|---------|--------------------------------------|
| video   | yt-dlp, ffmpeg, ffprobe, deno        |
| gallery | gallery-dl                           |
| spotify | spotdl, ffmpeg                       |

The video set mirrors `video-form.tsx`'s `missingExecutable` check exactly, so
Fast Download is never stricter than the existing form.

A `no-view` command cannot render the `Installer` (it is a `view`). So when a
required tool is missing, Fast Download shows a **Failure Toast** — title
"`<tool>` Is Not Installed", message "Open The Downloader to install it." — with a
`primaryAction` **"Set Up The Downloader"** that calls:

```ts
launchCommand({ name: "index", type: LaunchType.UserInitiated, context: { url } });
```

This launches the `Download` command, which (via the `index.tsx` change above)
picks `url` out of `launchContext`, routes to the matching form, and the form's
existing `fs.existsSync` check renders `<Installer>`. After the user installs the
tool, the form is already on screen with the URL pre-filled, ready to download.
The `launchCommand` call is wrapped in `try/catch` (defensive — `index` is the
primary command and always enabled).

## Feedback

A Raycast HUD is a single fire-and-forget overlay and cannot show progress, so the
progress surface is a **Toast** — the same animated Toast the gallery and Spotify
forms already use. The Toast is created before the download, updated through
`onProgress`, and set to `Success` / `Failure` at the end with an "Open Folder"
action (plus "Copy to Clipboard" of the file, for video). No separate `showHUD`
(confirmed in the brainstorm). See "Implementation notes" for the one Toast-
lifecycle behaviour to verify during the build.

## Error handling

- **Invalid / empty URL** — `url` is `required`, so Raycast will not launch the
  command without it; an invalid URL is still caught by `isValidUrl` → Failure
  toast, return.
- **Missing tool** — Failure toast + the "Set Up The Downloader" hand-off above.
- **Tool exits non-zero** (network error, unavailable media, geo-block) — the
  runner rejects with stderr; the command shows a Failure toast with a copy-error
  action — the same pattern as the gallery and Spotify forms.
- **`launchCommand` failure** — wrapped in `try/catch`; on the (unexpected) error
  the existing Failure toast remains visible.

## Testing

Unit tests only, vitest, pure modules — consistent with the existing `tests/`.

- **`tests/video-format.test.ts`** (extended) — `composeVideoFormat`: audio
  mediaType → `"bestaudio#<audioFormat>"` for mp3/m4a/opus; video mediaType →
  `"<selector>#<container>"` for a couple of quality/container combinations.
- **`tests/ytdlp.test.ts`** (new):
  - `buildVideoDownloadArgs` — the generalised audio branch: `"bestaudio#mp3"`,
    `"bestaudio#m4a"`, `"bestaudio#opus"` each yield `--extract-audio --audio-format
    <fmt> --audio-quality 0`; a video format (`"bestvideo+bestaudio/best#mp4"`)
    yields `--format … --recode-video mp4`; `--js-runtimes` is present only when
    `denoPath` is given.
  - `runVideoDownload` — mock `node:child_process` (as `tests/spotdl.test.ts`
    does): a `[download] 50.0%` stdout line calls `onProgress`; an `after_move`
    path line is captured; `close 0` resolves `{ filePath }`; stderr text +
    `close 1` rejects with that text.
- The command (`src/fast-download.ts`), the `index.tsx` change, and the spawn glue
  are verified by `npm run build` and the manual dev pass — views and process glue
  are not unit-tested elsewhere in this project either.

## Indicative build sequence

1. `package.json` — add the `fast-download` command; `npm run build` to regenerate
   `raycast-env.d.ts` (so `Arguments.FastDownload` exists).
2. `lib/video-format.ts` — add `composeVideoFormat`; extend
   `tests/video-format.test.ts` (test-first).
3. `lib/ytdlp.ts` — generalise the `buildVideoDownloadArgs` audio branch and add
   `runVideoDownload`; new `tests/ytdlp.test.ts` (test-first).
4. `src/index.tsx` — read `launchContext.url`.
5. `src/fast-download.ts` — the command.
6. `README.md` / `CHANGELOG.md` — document the new command.
7. Verification — `npm test`, `npm run build`, `npm run lint`, and a manual dev pass.

## Implementation notes (verify during build)

- **Toast actions from a no-view command.** Confirm that a Toast `primaryAction`
  ("Open Folder", "Set Up The Downloader") still fires after the command's async
  function returns. The Raycast docs do not state this explicitly. If Raycast
  tears the command down before the action can run, fall back: keep the success/
  failure message but state the path in the toast text, or use `showHUD` for the
  final confirmation. The progress Toast itself is unaffected — the command is
  alive (awaiting) while it updates.
- **yt-dlp progress stream.** `video-form.tsx` reads `[download] N%` and the
  `after_move:filepath` line from **stdout** with `--progress` and
  `PYTHONUNBUFFERED=1`. `runVideoDownload` parses the same stream — verify it
  matches in dev.
- **`launchContext` typing.** `index.tsx` reads `props.launchContext` via a local
  cast (`as { url?: string } | undefined`); a global `LaunchContext` augmentation
  is an alternative if a typed approach is preferred.

## Git

`macroplan.md` describes "merge to `develop`", but recent work — the end of
Section 1 and the off-plan Spotify feature — landed directly on `main`, and
`develop` now trails `main`. **Section 2 commits directly to `main`**, confirmed
with the user, consistent with how the Spotify feature was landed.
