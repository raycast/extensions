# Section 4 — Polished Download UX

**Date:** 2026-05-19
**Status:** Design — awaiting review
**Branch:** `main` — to be confirmed with the user before the first commit (see Git).

## Context

The Downloader is a Raycast extension that downloads video/audio (yt-dlp), image
galleries (gallery-dl), Spotify music (spotDL), and complete webpages (monolith).
It exposes two commands: an auto-routing `Download` **view** command and an
argument-driven `Fast Download` **no-view** command. Section 1 added a typed
download-defaults layer (`lib/config.ts`, `lib/video-format.ts`); Sections 2–3 and
the off-plan Spotify feature built Fast Download, monolith, and spotDL — all on
`main`.

This is **Section 4** of `docs/superpowers/macroplan.md`, the final section:
**redesign the `Download` command's form.**

Today `Download` (`src/index.tsx`) is a thin router: it auto-loads a URL (clipboard
/ selected text / browser / `launchContext`), calls `detectSource(url)`, and
renders one of four separate form components — `video-form.tsx`,
`gallery-form.tsx`, `spotify-form.tsx`, `webpage-form.tsx`. Routing is
**detection-only** — there is no user-facing way to override it. The video form
additionally carries a single combined Format dropdown (every concrete yt-dlp
format + a synthetic MP3 + a Transcript option) and — unlike the other three
forms — has **no folder picker**.

Section 4 replaces the four forms with **one adaptive form** built on a **Filetype
model**, and finally builds the user-overridable routing field the macro plan and
the Section 3 spec both anticipated.

**Note on Section 1's onboarding.** The `onboarding.tsx` first-run view described
in the Section 1 plan is **not present on `main`** — the configuration layer
shipped, the onboarding view did not (it is likely on the unmerged
`feature/settings-onboarding` branch). Section 4 builds against `main` as it
actually is: it does not wire to onboarding, and the redesigned form's secondary
actions are the ones `video-form.tsx` actually has today — Update Libraries and
About.

## Goals

- One adaptive `Download` form, replacing the four detection-routed form files.
- A **Filetype** field — *image / video / audio / transcript / website* — the
  *outcome* the user wants. Auto-detected, **user-overridable**. This is the macro
  plan's "method" field, reframed around outcomes rather than tool names.
- Per-filetype **adaptive spec fields**, pre-filled from the Section 1
  configuration and overridable per download.
- A **folder picker** on every filetype (the video form lacks one today).
- An adaptive **status line** at the top of the form; **icons** on the Filetype
  options.
- **Transcript** becomes a first-class filetype.
- The **image** filetype gains thumbnail download for video URLs (yt-dlp
  `--write-thumbnail`), alongside its existing gallery behaviour.
- A new Settings checkbox unlocking **exact yt-dlp format selection** for power
  users.
- New pure logic covered by unit tests; the form unified onto the awaitable
  `lib/` runners.

## Non-goals (explicitly out of scope)

- **A new command.** The redesign is confined to the `Download` command.
  `Fast Download` and the `src/tools/` AI tools are untouched.
- **Changing detection.** `lib/detect.ts` / `detectSource` is unchanged — Section
  4 *consumes* it. The override is the form's Filetype field, not a detection
  change.
- **Per-content-type download folders** — the shared `downloadPath` is kept.
- **Image format/quality conversion** — gallery-dl fetches originals; the Section
  1 rationale ("images have no defaults") stands.
- **A thumbnail resolution picker** — the image filetype takes the best available
  thumbnail; no spec field.
- **A transcript language picker** — transcript extraction stays English-default,
  as `transcript.ts` is today.
- **markitdown / faster-whisper** — deferred by the macro plan.
- **Download history** and a menu-bar command.
- **An in-form image preview** — a Raycast `Form` cannot embed an image; not
  pursued. Icons on the Filetype options are the "graphic element" instead.
- **Onboarding** — see the Context note; no onboarding view is wired.
- **Changes to `installer.tsx`, `updater.tsx`, or the `lib/` tool wrappers** —
  all unchanged; the sole exception is the thumbnail runner added to
  `lib/ytdlp.ts`.

## The Filetype model

The redesign's core idea. The form's second field is **Filetype** — *what the user
wants out* — not which tool runs:

| Filetype | Meaning |
|---|---|
| 🎬 video | the video file |
| 🎵 audio | audio only |
| 🖼 image | the video's thumbnail, or every image of a gallery |
| 📝 transcript | the video's captions as a `.txt` |
| 🌐 website | the page saved as one self-contained `.html` |

The **tool is derived** from the pair *(detected source, chosen filetype)* — the
user never names yt-dlp / gallery-dl / spotDL / monolith. This is the macro plan's
"method field (yt-dlp / gallery-dl / monolith)" reframed: picking an *outcome* is
friendlier than picking a tool, and it resolves the open problem Section 1's spec
flagged — that "format-type / quality / extension" is a video-only triad. In the
Filetype model each filetype simply carries the spec fields it needs (0, 1, or 2
of them); the triad is no longer forced onto galleries and webpages.

**Detection preselects the filetype.** `detectSource(url)` already returns
`"video" | "gallery" | "spotify" | "webpage"`; the form maps that to a default
Filetype:

| Detected source | Default Filetype |
|---|---|
| video | `video`, or `audio` when the `videoMediaType` preference is "audio" |
| gallery | `image` |
| spotify | `audio` |
| webpage | `website` |

**All five filetypes are always shown** in the dropdown — detection only
*preselects*. This is what makes the field a genuine override: a video on a site
that is not in `VIDEO_DOMAINS` is detected as `"webpage"` (the Section 3 allowlist
fallthrough), and the user corrects it with one dropdown change to `video` or
`audio`. The Section 3 spec named exactly this as the planned fix for a misroute.

Nonsense pairs (e.g. `transcript` on a Spotify link) are reachable but rare; they
fail at download with a clear error toast — an accepted trade-off for keeping the
override unrestricted.

## Architecture

```
src/
  index.tsx          MODIFIED — slim router: auto-load → <DownloadForm>
  lib/
    filetype.ts      NEW — the Filetype model: type + pure resolution functions
    ytdlp.ts         MODIFIED — adds buildThumbnailArgs + runThumbnailDownload
    detect.ts        (unchanged) — detectSource() consumed as-is
    config.ts        (unchanged) — getConfig() consumed as-is
    video-format.ts  (unchanged) — composeVideoFormat() consumed as-is
    gallerydl.ts     (unchanged) — runGalleryDownload() consumed as-is
    spotdl.ts        (unchanged) — runSpotdlDownload() consumed as-is
    monolith.ts      (unchanged) — runMonolithSave(), webpageFilename() consumed as-is
  views/
    download-form.tsx  NEW — the single adaptive form
    video-form.tsx     DELETED
    gallery-form.tsx   DELETED
    spotify-form.tsx   DELETED
    webpage-form.tsx   DELETED
    installer.tsx      (unchanged)
    updater.tsx        (unchanged)
  transcript.ts      (unchanged) — extractTranscript() consumed as-is
  utils.ts           (unchanged) — path resolvers + getFormats/getFormatValue/getFormatTitle reused
  types.ts           (unchanged)
tests/
  filetype.test.ts   NEW — the Filetype model's pure functions
  ytdlp.test.ts      MODIFIED — adds buildThumbnailArgs cases
package.json         MODIFIED — one new preference (exactFormatSelection)
README.md            MODIFIED — mention thumbnail download
SUPPORTED_SITES.md   MODIFIED — mention thumbnail download
CHANGELOG.md         MODIFIED — a release entry
```

The four per-tool forms collapse into one because they already share almost
everything — a URL field, a destination/folder, the missing-tool `Installer`
check, the submit-to-runner-with-a-toast pattern — and four files inevitably
drift (today the video form has no folder picker and the other three do). One
adaptive form is also the literal shape of the user's sketches.

## Components

### `src/lib/filetype.ts` (new)

The Filetype model as pure, `@raycast/api`-free, unit-testable logic — the single
place that knows how filetypes map to tools. It exposes:

- **`Filetype`** — `"image" | "video" | "audio" | "transcript" | "website"`.
- **`defaultFiletype(source: SourceType, audioPreferred: boolean): Filetype`** —
  the detection→default map above. `audioPreferred` is `videoMediaType === "audio"`,
  so a video source defaults to `audio` when the user's Section 1 preference says
  so.
- **`resolveTool(source: SourceType, filetype: Filetype): ToolId`** — the
  *(source, filetype)* → tool function (see "Filetype → tool routing").
- **`requiredTools(source: SourceType, filetype: Filetype): string[]`** — the
  executables that must exist for a given selection, for the form's missing-tool
  check (see "Error handling"). The return type is `string[]`, not `ToolId[]`,
  because the set includes `ffprobe`, which is not a registry `ToolId`.

`ToolId` and `SourceType` are imported from the existing `lib/tools.ts` and
`types.ts`. No `@raycast/api` import, so the module loads in vitest.

`requiredTools` returns, per selection:

| Filetype | Source | Required tools |
|---|---|---|
| video | any | yt-dlp, ffmpeg, ffprobe, deno |
| audio | spotify | spotdl, ffmpeg |
| audio | other | yt-dlp, ffmpeg, ffprobe, deno |
| image | gallery | gallery-dl |
| image | other | yt-dlp, ffmpeg |
| transcript | any | yt-dlp, ffmpeg |
| website | any | monolith |

These match what the four current forms check today (`video-form.tsx` →
yt-dlp/ffmpeg/ffprobe/deno, `spotify-form.tsx` → spotdl/ffmpeg, `gallery-form.tsx`
→ gallery-dl, `webpage-form.tsx` → monolith); the transcript and image-thumbnail
rows need only yt-dlp + ffmpeg.

### `src/lib/ytdlp.ts` (modified)

Add a thumbnail download path next to the existing `buildVideoDownloadArgs` /
`runVideoDownload`, keeping the module `@raycast/api`-free:

- **`buildThumbnailArgs(o: { url: string; outputTemplate: string }): string[]`**
  — pure. Builds `yt-dlp --write-thumbnail --skip-download --no-playlist -o
  <template> <url>`. `--skip-download` fetches only the thumbnail; `--no-playlist`
  keeps a playlist-item URL to its single thumbnail. The thumbnail is saved in its
  native format (`.webp` / `.jpg` / `.png`, per the source) — there is no
  `--convert-thumbnails` step, so the route needs no ffmpeg. (See Implementation
  notes.)
- **`runThumbnailDownload(binaryPath, options, ...): Promise<{ filePath: string }>`**
  — spawns yt-dlp with `buildThumbnailArgs`, accumulates stderr, resolves with the
  saved image path on a zero exit and rejects with the stderr text otherwise.
  There is no percentage progress (a thumbnail is one small file) — callers show
  an indeterminate animated toast, as monolith's runner already does. The exact
  stdout line that carries the saved path is an Implementation Note to confirm
  during the build.

`buildThumbnailArgs` is pure and unit-tested; `runThumbnailDownload` is process
glue, verified by the manual pass — consistent with how the other runners are
treated.

### `src/views/download-form.tsx` (new)

The single adaptive form, exporting `DownloadForm`. Prop: `{ initialUrl: string }`
— the URL `index.tsx` auto-loaded. The form owns all field state thereafter.

**State & reactivity:**

- URL field state, seeded from `initialUrl`.
- A `Filetype` state, seeded by `defaultFiletype(detectSource(initialUrl), …)`, plus
  a "filetype touched" flag: editing the URL re-runs detection and updates the
  default *only while the user has not manually changed the Filetype* (mirroring
  the `typeTouched` pattern sketched in the Section 1 plan).
- Spec-field state: quality, container, audio format, save mode, exact format —
  each seeded from the matching Section 1 preference (`videoQuality`,
  `videoContainer`, `audioFormat` / `spotifyAudioFormat`, `webpageSaveMode`).
- Folder state, seeded from the `downloadPath` preference.
- **Metadata fetch:** when the current selection resolves to yt-dlp (filetype
  `video` or `transcript`, or `audio` / `image` on a non-Spotify / non-gallery
  source), the form fetches `fetchVideoInfo` via `usePromise` keyed on the URL. The
  result powers the status line (title + duration), the live-stream guard, and —
  when enabled — the Exact Format list. Non-yt-dlp selections do no metadata fetch.

**Missing-tool check.** The form computes `requiredTools(source, filetype)`,
resolves each to a path via the `utils.ts` resolvers, and checks `fs.existsSync`.
If any is missing it renders `<Installer executable={firstMissing} onRefresh={…} />`
— the existing shared flow. Because the check keys off the *current* filetype, it
is reactive: switching to `website` while monolith is absent swaps the form for
monolith's `Installer`.

**Fields** (see "The form" below for the progressive-disclosure rules):

1. **Status line** — a `Form.Description`. Adaptive text (see "The form").
2. **URL** — `Form.TextField`, autofocus; `onChange` re-detects.
3. **Filetype** — `Form.Dropdown`, five items, each with a Raycast `Icon`
   (`Video`, `Music`, `Image`, `Text`, `Globe`); preselected by detection.
4. **Spec fields** — rendered per filetype (see the table in "The form").
5. **Folder** — `Form.FilePicker`, single directory, default `[downloadPath]`.

**Submit.** `onSubmit` switches on the filetype, calls the resolved runner with a
progress toast, and reports success/failure — see "Filetype → tool routing" and
"Data flow". The form `await`s the runner, unifying onto the awaitable `lib/`
runners (today's `video-form.tsx` spawns yt-dlp inline; Section 2 built
`runVideoDownload` specifically for this retrofit, noted there as "Section 4's
form overhaul"). The view stays mounted while the runner is awaited — the same
behaviour the gallery / Spotify / webpage forms have today.

**Actions.** `Action.SubmitForm` "Download" (`Icon.Download`); a second section
with `Action.Push` "Update Libraries" (→ `Updater`) and `Action.OpenInBrowser`
"About This Extension". The `searchBarAccessory` keeps the "Supported Sites" link.
These carry over verbatim from `video-form.tsx`; the gallery/Spotify/webpage forms
have no extra actions to preserve.

### `src/index.tsx` (modified)

Slimmed to a thin shell. It keeps the startup `useEffect` that auto-loads a URL
(`launchContext` → clipboard → selected text → browser extension, exactly as
today) and the `<Form isLoading />` placeholder while that runs. It then renders
`<DownloadForm initialUrl={loadedUrl} />`.

Removed: the `SourceType` state, the `detectSource` call, the four form imports,
and the four-way routing branch — all of that moves into the form. `index.tsx`
keeps `LaunchProps` (for `launchContext`).

### Deleted files

`views/video-form.tsx`, `views/gallery-form.tsx`, `views/spotify-form.tsx`,
`views/webpage-form.tsx` — every behaviour they hold is reproduced by
`download-form.tsx` over the unchanged `lib/` runners.

### `package.json` (modified)

One new preference, placed at the end of the existing "Video:" preference group
(after `audioFormat`) so the flat list still reads as grouped:

```json
{
  "name": "exactFormatSelection",
  "title": "Video: Exact Format Selection",
  "description": "Show an Exact Format field in the Download form for video downloads — every concrete yt-dlp format with its file size. Leave off for simple Quality + Container choices.",
  "type": "checkbox",
  "label": "Enable",
  "default": false,
  "required": false
}
```

`raycast-env.d.ts` (generated, gitignored) regenerates on `npm run build` to
include `exactFormatSelection`. The `index` command's `description` already reads
"Download video, audio, galleries, webpages, or transcripts" — no change needed.
`getConfig()` in `config.ts` is **not** extended; the form reads
`exactFormatSelection` directly via `getPreferenceValues`, alongside `downloadPath`
and `cookiesFromBrowser`, which it already needs.

## The form — fields and progressive disclosure

The form reveals fields as the user fills it in, matching the three sketches:

- **No valid URL** → only the status line and the URL field show.
- **Valid URL** → the Filetype dropdown, the spec fields for the current filetype,
  and the Folder picker all appear. Selecting a different Filetype swaps the spec
  fields in place.

**Spec fields per filetype:**

| Filetype | Spec field(s) | Source of the default |
|---|---|---|
| video | Quality (Best / 1080p / 720p / 480p / Smallest) + Container (MP4 / MKV / WebM) + Exact Format *(only when `exactFormatSelection` is on)* | `videoQuality`, `videoContainer` |
| audio | Format (MP3 / M4A / Opus; FLAC added when the source is Spotify) | `audioFormat` (yt-dlp) / `spotifyAudioFormat` (Spotify) |
| image | — none — | — |
| transcript | — none — | — |
| website | Save Mode (Complete / Lightweight) | `webpageSaveMode` |

Every spec field is a `Form.Dropdown` pre-filled from the matching Section 1
preference and overridable for this one download.

**The status line** is a single `Form.Description` whose text adapts:

- empty / invalid URL → a short prompt ("Paste a link to download");
- a yt-dlp selection with metadata loaded → the media title + duration;
- a non-yt-dlp selection → a plain-language description of the detected source and
  what will happen (e.g. "Imgur album — gallery-dl will fetch every image");
- a `webpage` fallthrough → a warning plus the override hint ("Not a known media
  site — will be saved as HTML; change Filetype to force video/audio").

It replaces the bare "Title" `Form.Description` the video form shows today.

**The Exact Format field.** When the `exactFormatSelection` preference is on *and*
the filetype is `video`, an additional "Exact Format" `Form.Dropdown` appears. Its
first item is **"Auto — use Quality + Container above"**; the rest are the concrete
formats from the fetched metadata, rendered with the existing
`getFormats` / `getFormatValue` / `getFormatTitle` helpers in `utils.ts` (which
already produce "resolution | ext | bitrate | filesize" labels). "Auto" is the
default, so enabling the preference changes nothing until the user deliberately
picks a concrete format — at which point that exact format string is used for the
download instead of the composed Quality + Container selector. Until the metadata
resolves, the dropdown shows only "Auto".

**Graphic element.** A Raycast `Form` cannot embed an image, so the "download
graphic element" the macro plan named is realised as **icons** — a Raycast `Icon`
on each Filetype dropdown item, plus the existing `Icon.Download` on the submit
action. A literal thumbnail preview would require replacing the `Form` with a
`Detail`-based two-screen flow and is explicitly out of scope.

## Filetype → tool routing

`resolveTool(source, filetype)` and the form's submit dispatch follow this table:

| Filetype | Detected source | Tool | Runner | Result |
|---|---|---|---|---|
| video | any | yt-dlp | `runVideoDownload` | `{ filePath }` |
| audio | spotify | spotDL | `runSpotdlDownload` | `{ tracks }` |
| audio | other | yt-dlp | `runVideoDownload` | `{ filePath }` |
| image | gallery | gallery-dl | `runGalleryDownload` | `{ files }` |
| image | other | yt-dlp | `runThumbnailDownload` *(new)* | `{ filePath }` |
| transcript | any | yt-dlp | `extractTranscript` | `{ transcript, title }` |
| website | any | monolith | `runMonolithSave` | `{ filePath }` |

- **video** — `format = composeVideoFormat({ mediaType: "video", quality,
  container, audioFormat })`, unless an Exact Format was picked, in which case that
  value is used directly. `outputTemplate = path.join(folder, "%(title)s
  (%(id)s).%(ext)s")` (yt-dlp fills the title, matching `fast-download.ts`).
- **audio (yt-dlp)** — `format = composeVideoFormat({ mediaType: "audio",
  audioFormat, quality: "", container: "" })` → `bestaudio#<audioFormat>`; the
  generalised audio branch of `buildVideoDownloadArgs` (Section 2) handles it.
- **audio (spotDL)** — `runSpotdlDownload` with `format` from `spotifyAudioFormat`
  and the resolved ffmpeg path.
- **image (gallery)** — `runGalleryDownload` with the `cookiesFromBrowser`
  preference.
- **image (thumbnail)** — `runThumbnailDownload`.
- **transcript** — `extractTranscript(url)` returns `{ transcript, title }`; the
  form writes `<folder>/<title>.txt` and offers Open + Copy actions, exactly as
  `video-form.tsx`'s transcript branch does today.
- **website** — `outputPath = path.join(folder, webpageFilename(url))`;
  `runMonolithSave` with `noJavaScript` from the Save Mode field.

All runners except `runThumbnailDownload` already exist and are unchanged.

## Data flow — a video download

1. The command opens. `index.tsx` auto-loads a URL and renders
   `<DownloadForm initialUrl={url} />`.
2. The form runs `detectSource(url)` → `"video"`; `defaultFiletype` → `video` (or
   `audio` per the `videoMediaType` preference). `requiredTools` → yt-dlp, ffmpeg,
   ffprobe, deno — all present.
3. The selection is yt-dlp-bound, so `fetchVideoInfo` runs; the status line shows
   the title and duration. The Quality / Container fields show, defaulted from
   Settings; the Folder picker shows `~/Downloads`.
4. The user adjusts Quality to 1080p and submits. `onSubmit` composes the format,
   builds the output template, and `await`s `runVideoDownload` with an animated
   toast updated by the percentage callback.
5. yt-dlp exits 0; the toast turns green — "Downloaded", the file name, with
   **Open Folder** and **Copy to Clipboard** actions.

Gallery, Spotify, transcript, thumbnail, and website downloads follow the same
shape via their runners, reporting `N files` / `N tracks` / the file name and the
matching success actions.

## Error handling

- **Missing tool** — the form renders `<Installer executable={tool} />` for the
  first missing tool of `requiredTools(source, filetype)`; reactive to the
  Filetype choice. `onRefresh` re-checks, exactly as the current forms do.
- **Invalid / empty URL** — a validation error on the URL field; submit is
  blocked.
- **Live stream** — the existing guard, carried over from `video-form.tsx`: when
  yt-dlp metadata reports a live status, the video and audio downloads are blocked
  with a clear message. `extractTranscript` rejects live streams on its own; an
  image (thumbnail) of a live stream is allowed.
- **A runner exits non-zero**, or a **nonsense filetype + URL pair** (e.g.
  `transcript` on a Spotify link) — the runner rejects; a failure toast shows the
  error text with a copy-error action, the pattern every current form and
  Fast Download already use.
- **No captions** (transcript) — `extractTranscript` throws a clear "no transcript
  available" message → failure toast.

## Testing

Unit tests only, vitest, pure modules — consistent with the existing `tests/`.

- **`tests/filetype.test.ts`** (new) — `defaultFiletype` (each source, and the
  `audioPreferred` branch), `resolveTool` (each row of the routing table), and
  `requiredTools` (each selection's tool set).
- **`tests/ytdlp.test.ts`** (extended) — `buildThumbnailArgs`: `--write-thumbnail`,
  `--skip-download`, `--no-playlist`, the `-o` template, and the URL last.
- `download-form.tsx`, `index.tsx`, and the process glue are verified by
  `npm run build` and the manual dev pass — views are not unit-tested elsewhere in
  this project either.
- **Verification:** `npm test`, `npm run build`, `npm run lint`. Per project
  gotchas: `raycast-env.d.ts` is generated — run `npm run build` once after the
  `package.json` change before trusting the `exactFormatSelection` type; `ray lint`
  flags the pre-existing `author` field, unrelated to this work.
- **Manual (`npm run dev`):** each filetype against a representative URL (a
  YouTube link as video / audio / image / transcript; a Reddit or imgur album as
  image; a Spotify link as audio; a plain article as website); the Filetype
  override on a URL detection misroutes; the `exactFormatSelection` checkbox
  off → on → picking a concrete format; a missing-tool flow (point a tool's path
  preference at a non-existent file → confirm the `Installer` appears and the form
  re-renders after install).

## Indicative build sequence

1. `lib/filetype.ts` + `tests/filetype.test.ts` — the pure Filetype model,
   written test-first.
2. `lib/ytdlp.ts` — add `buildThumbnailArgs` + `runThumbnailDownload`; extend
   `tests/ytdlp.test.ts` for the builder, test-first.
3. `package.json` — add the `exactFormatSelection` preference; `npm run build` to
   regenerate `raycast-env.d.ts` so `ExtensionPreferences` includes it.
4. `views/download-form.tsx` — the adaptive form.
5. `src/index.tsx` — slim it to auto-load → `<DownloadForm>`.
6. Delete `video-form.tsx`, `gallery-form.tsx`, `spotify-form.tsx`,
   `webpage-form.tsx`.
7. `README.md`, `SUPPORTED_SITES.md`, `CHANGELOG.md` — document the redesign and
   thumbnail download.
8. Verification — `npm test`, `npm run build`, `npm run lint`, and the manual
   dev-mode pass.

Ordering rationale: the form (4) imports `lib/filetype.ts` (1) and the thumbnail
runner (2), and reads the `exactFormatSelection` preference added in (3); `index.tsx`
(5) renders the form; the four forms are deleted (6) only once nothing imports
them.

## Implementation notes (verify during build)

- **yt-dlp thumbnail path.** `runThumbnailDownload` resolves `filePath` by parsing
  the `Writing … thumbnail … to:` line from yt-dlp's stdout. Confirm during the
  manual dev pass that yt-dlp's wording still matches the regex; the runner
  resolves with an empty `filePath` if no line matches, so a missed parse degrades
  gracefully (the download still succeeds) rather than failing.
- **`useForm` vs controlled state.** `video-form.tsx` uses `@raycast/utils`'
  `useForm`; the other three forms use plain `id`-based fields. For a form whose
  fields are conditionally rendered, the plan should pick one approach — if
  `useForm` is used, its `validation` keys must match the fields actually
  rendered for the current filetype.
- **Dead code after the deletion.** `DownloadOptions` in `utils.ts` is used only by
  `video-form.tsx`; once that file is deleted, `grep` for remaining references and
  remove `DownloadOptions` if it is unused. `getFormats` / `getFormatValue` /
  `getFormatTitle` stay — they are reused by the Exact Format dropdown.
- **Output templates.** The yt-dlp routes use the `%(title)s (%(id)s).%(ext)s`
  template (yt-dlp fills the fields), matching `fast-download.ts`, rather than the
  client-substituted title `video-form.tsx` uses today.
- **`raycast-env.d.ts`** is generated and gitignored — run `npm run build` after
  step 3 before relying on the new preference's type.

## Git

`macroplan.md` describes "merge to `develop`", but Sections 1–3 and the off-plan
Spotify feature all landed directly on `main`, and `develop` trails. Section 4
follows suit and **commits to `main`** — to be confirmed with the user before the
first commit, per their standing request.

The detailed implementation plan (with checkpoints) will be produced from this
spec.
