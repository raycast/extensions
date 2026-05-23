# Section 1 — Settings & Onboarding

**Date:** 2026-05-18
**Status:** Design — awaiting review
**Branch:** `feature/settings-onboarding`

## Context

The Downloader is a Raycast extension forked from the Video Downloader extension,
being grown into a multi-source download tool per `docs/superpowers/macroplan.md`.
Phase 2 (gallery-dl image galleries, URL auto-routing, transcript output) is
complete and merged to `develop`.

This is **Section 1** of the macro plan: define the extension's configuration —
a set of per-content-type download defaults plus the download folder — and add a
first-run onboarding experience.

Section 1 is **foundational**, not user-visible behavior: Section 2 (Fast
Download) and Section 4 (Polished Download UX) read their configuration from the
layer this section builds. Section 1 itself does not change how downloads behave.

## Goals

- A typed configuration layer for per-content-type download defaults that
  Sections 2 and 4 will consume.
- Five new preferences: video defaults (media type, quality, container, audio
  format) and a webpage default.
- A first-run onboarding view that welcomes the user, reports CLI-tool status
  with an install action, and points the user at settings.
- The configuration's pure logic is verified by a unit test.

## Non-goals (explicitly out of scope)

- Changing download behavior. The video and gallery download flows behave
  exactly as today; the new defaults are not yet consumed — Sections 2 and 4 do
  that. (`video-form.tsx` gains only a non-download navigation action; see
  Components.)
- A custom settings *editor*. Settings live in Raycast's native preferences UI;
  onboarding is a guide, not a second configuration store.
- Per-content-type download folders — one shared `downloadPath` is kept.
- Image format/quality conversion (see "Why images have no defaults").
- monolith / webpage saving itself — that is Section 3. `webpageSaveMode` is
  declared here but inert until then.
- Renaming preference `name` keys (which would discard existing settings).
- Refactoring the existing scattered preference reads in `utils.ts` /
  `video-form.tsx` — unrelated to this section.

## Open decision resolved: flat preferences vs. custom onboarding view

The macro plan flagged this as the section's key decision. Resolution:

- **Settings → native Raycast preferences** — a flat list in `package.json`.
  Type-safe via `getPreferenceValues`, zero persistence code, reachable through
  ⌘,. The list cannot be visually grouped into boxes; title-prefixing
  (`Video: …`, `Gallery: …`) and deliberate ordering approximate the grouping
  from the onboarding sketch.
- **Onboarding → a custom first-run view** built from native primitives (a
  `Detail`), gated by a `LocalStorage` flag and rendered by `index.tsx`. It is a
  welcome + tool-check + pointer to settings — not a settings editor.

Rejected alternatives:

- *No onboarding view* — only mark preferences `required` so Raycast force-shows
  its own preference screen. Zero code, but removes onboarding as a deliverable
  and offers no up-front tool installation.
- *Custom `Form` settings editor* persisting to `LocalStorage` — matches a
  grouped layout best, but rebuilds the settings system into a second
  configuration home and loses the native ⌘, integration. Too heavy for the
  payoff, and the user explicitly wants native primitives, not a sketch
  reproduction.

## Architecture

```
src/
  index.tsx          router — gains a first-run onboarding gate
  lib/
    binary.ts        (unchanged) — reused by onboarding for tool detection
    config.ts        NEW — typed download-default config + videoFormatSelector
    detect.ts        (unchanged)
    ytdlp.ts         (unchanged)
    gallerydl.ts     (unchanged)
  views/
    video-form.tsx   gains a "Setup & Tools" action; download logic unchanged
    gallery-form.tsx (unchanged)
    onboarding.tsx   NEW — first-run welcome + tool checklist
    installer.tsx    (unchanged) — remains the thorough per-tool fallback
    updater.tsx      (unchanged)
tests/
  config.test.ts     NEW — videoFormatSelector
package.json         5 new preferences; existing preferences retitled + reordered
```

## The configuration schema

### New preferences

Five `dropdown` preferences, each with a default — so none is `required`, and
Raycast never force-shows its preference screen (onboarding is the sole first-run
UI).

| name | title | values (title → value) | default |
|---|---|---|---|
| `videoMediaType` | Video: Media Type | Video → `video`, Audio Only → `audio` | `video` |
| `videoQuality` | Video: Quality | Best Available → `best`, 1080p → `1080`, 720p → `720`, 480p → `480`, Smallest File → `smallest` | `best` |
| `videoContainer` | Video: Container | MP4 → `mp4`, MKV → `mkv`, WebM → `webm` | `mp4` |
| `audioFormat` | Video: Audio Format | MP3 → `mp3`, M4A → `m4a`, Opus → `opus` | `mp3` |
| `webpageSaveMode` | Webpage: Save Mode | Complete → `complete`, Lightweight (no JavaScript) → `lightweight` | `complete` |

Mapping to the macro plan's "format / quality / extension" triad, for video:
**format** → media type, **quality** → quality, **extension** → container (and,
for the audio path, audio format).

Behavior notes:

- **Audio is always extracted at best quality** — there is no audio-bitrate
  preference, intentionally keeping the schema minimal. This matches today's MP3
  path (`--audio-quality 0`).
- Flat preferences cannot hide conditionally: when Media Type is `audio`, the
  Quality and Container fields are still shown but irrelevant; when `video`, the
  Audio Format field is irrelevant. The consuming logic (Sections 2 & 4) ignores
  the inapplicable fields; Section 4's custom form will hide them properly.
- `webpageSaveMode` is declared now so onboarding and settings can present all
  three content types, but it is **inert until Section 3** wires up monolith.

### Why images have no defaults

gallery-dl is a downloader, not a converter: it fetches each file in the
source's original format and resolution — which is the highest quality
available — and exposes no format/quality selection. Forcing a target image
format would require a post-process conversion step via ImageMagick, a new heavy
CLI dependency; re-encoding only ever degrades originals or serves a niche
space-saving want. This is rejected as contrary to keeping the extension
self-contained and minimal.

Images are therefore configured only by the shared `downloadPath` and the
existing `cookiesFromBrowser` preference — no new image preferences. The
format/quality/extension triad is genuinely a video concept; the asymmetry
across the three content types is the honest shape of the three tools.

### Retitle + reorder of existing preferences

Existing preferences keep their `name` keys (no settings migration) but are
retitled and reordered so the flat list reads as grouped. Final order in
`package.json`:

1. Download Folder (`downloadPath`)
2. Video: Media Type, Video: Quality, Video: Container, Video: Audio Format
3. Webpage: Save Mode (`webpageSaveMode`)
4. Auto Load URL from Clipboard, Auto Load URL from Selected Text, Enable
   Browser Extension Support
5. Gallery: Cookies from Browser (`cookiesFromBrowser`)
6. Homebrew Path, yt-dlp Path, ffmpeg Path, ffprobe Path, gallery-dl Path,
   Force IPv4

Only the `title` field and array order change; `name`, `type`, `default`, and
`data` of existing preferences are untouched.

## Components

### `src/lib/config.ts` (new)

The single import point for download-default configuration — the module
Sections 2 and 4 will import. It exposes:

- **`DownloaderConfig`** — a type covering the five default fields.
- **`getConfig(): DownloaderConfig`** — a thin typed wrapper over
  `getPreferenceValues` returning the five values.
- **`videoFormatSelector(quality: string): string`** — pure. Maps a generic
  quality token to a yt-dlp `-f` format selector:
  - `best` → `bestvideo+bestaudio/best`
  - `1080` → `bestvideo[height<=1080]+bestaudio/best[height<=1080]`
  - `720` → `bestvideo[height<=720]+bestaudio/best[height<=720]`
  - `480` → `bestvideo[height<=480]+bestaudio/best[height<=480]`
  - `smallest` → `worstvideo+worstaudio/worst`

`videoFormatSelector` is pure and unit-tested — the verified proof that the
quality schema is implementable. Container selection (`--recode-video` /
`--merge-output-format`) is already handled by `buildVideoDownloadArgs` in
`lib/ytdlp.ts`; `videoFormatSelector` covers only the `-f` selector. Combining
the two into a full Fast Download invocation is Section 2's work.

`lib/config.ts` owns only the new download-defaults surface. Existing
infrastructure preferences (executable paths, auto-load toggles, cookies) keep
their current access in `utils.ts` — there is no key overlap and no refactor of
existing readers.

### `src/views/onboarding.tsx` (new)

A `Detail` view. Props: `onComplete: () => void`.

Markdown content:

- A welcome heading and one or two lines on what the extension does — download
  video, audio, image galleries, and YouTube transcripts (and webpages in a
  later release).
- A **tool checklist** — yt-dlp, ffmpeg, ffprobe, gallery-dl — each marked
  detected or missing, computed from `resolveBinary` (`lib/binary.ts`) +
  `fs.existsSync`.
- A line stating the current download folder and that the download defaults are
  configurable in settings.

ActionPanel:

- **Install Missing Tools** — shown only when at least one tool is missing. Runs
  the package manager directly to install all missing tools in one call
  (`brew install <tools…>` on macOS; winget on Windows, mirroring
  `installer.tsx`'s existing capability) with a simple animated → success /
  failure toast. It does not replicate the Installer's full error handling; the
  per-tool `Installer` remains the thorough fallback for when a form later
  encounters a missing tool. On success, the tool list is re-checked.
- **Open Settings** — `openExtensionPreferences()`.
- **Finish Setup** (primary action) — calls `onComplete()`.

### `src/index.tsx` (modified)

The router gains a first-run onboarding gate. Its existing startup `useEffect`
(which performs URL auto-load) additionally reads
`LocalStorage.getItem("hasCompletedOnboarding")`. A `showOnboarding` state value
is derived:

- Flag absent → `showOnboarding = true`.
- Flag present → `showOnboarding = false`.
- Read throws → `showOnboarding = false` — a storage fault must never block the
  user.

While the startup effect runs, render `<Detail isLoading />` (today it renders
`<Form isLoading />`).

When `showOnboarding` is true, render `<Onboarding onComplete={…} />`. The
`onComplete` callback writes `LocalStorage.setItem("hasCompletedOnboarding",
"true")` and sets `showOnboarding = false`, after which the existing routed form
renders. URL auto-load still happens during the startup effect, so a URL loaded
from the clipboard / selection / browser is already populated when the routed
form appears after onboarding.

### `src/views/video-form.tsx` (modified)

One addition: a **"Setup & Tools"** `Action.Push` in the action panel (in the
second `ActionPanel.Section`, alongside "Update Libraries"), targeting
`<Onboarding>`, so the onboarding / tool-status view is revisitable after first
run. When onboarding is reached this way, `onComplete` pops the navigation stack
instead of writing the flag (the flag is already set). The form's download logic
is otherwise unchanged.

## Data flow

1. Command opens → `index.tsx` startup effect runs URL auto-load (unchanged) and
   reads the onboarding flag.
2. Flag unset → `<Onboarding>` renders.
   - The user may install missing tools and/or open settings.
   - "Finish Setup" → the flag is written → `<Onboarding>` unmounts → the normal
     routed form renders (with any auto-loaded URL already populated).
3. Flag set → the normal router renders directly — today's behavior.
4. Later, "Setup & Tools" in the video form pushes `<Onboarding>`; "Finish Setup"
   pops back.
5. Sections 2 and 4 (future) call `getConfig()` and `videoFormatSelector()` to
   drive downloads from the configured defaults.

## Error handling

- LocalStorage flag absent → show onboarding. LocalStorage read error → skip
  onboarding — the user is never blocked by a storage fault.
- Tool installation failure during onboarding → a failure toast with the error
  message. The thorough per-tool `Installer` (with Homebrew/winget ENOENT
  detection and recovery actions) still triggers when a form encounters a
  missing tool.
- All new preferences have defaults → no `required` preference → Raycast never
  force-shows its preference screen.
- Onboarding never validates configuration: every preference has a sane default,
  so "Finish Setup" is always allowed.

## Testing

- **Unit (vitest):** `tests/config.test.ts` covers `videoFormatSelector` — each
  quality token (`best`, `1080`, `720`, `480`, `smallest`) maps to the expected
  yt-dlp selector string. This is the section's pure logic; `getConfig` and the
  views are verified manually.
- **Manual (`npm run dev`):**
  - With the `hasCompletedOnboarding` LocalStorage flag cleared, the command
    opens onto the onboarding view; the tool checklist matches reality.
  - "Open Settings" opens extension preferences; the five new dropdowns appear,
    grouped by title prefix and ordered, each with its default selected.
  - "Finish Setup" → relaunching the command goes straight to the routed form,
    with no onboarding.
  - "Setup & Tools" in the video form pushes onboarding; "Finish Setup" pops
    back to the form.
  - With a tool uninstalled, the checklist marks it missing and the "Install
    Missing Tools" action appears and installs it.

## Indicative build sequence

1. `package.json` — add the five preferences and retitle + reorder the existing
   ones. Run `npm run build` to regenerate `raycast-env.d.ts` so
   `ExtensionPreferences` includes the new keys.
2. `src/lib/config.ts` + `tests/config.test.ts` — the typed config and the pure
   `videoFormatSelector`, written test-first.
3. `src/views/onboarding.tsx` — the onboarding `Detail`.
4. `src/index.tsx` — the LocalStorage onboarding gate.
5. `src/views/video-form.tsx` — the "Setup & Tools" action.
6. Final verification — `npm test`, `npm run build`, `npm run lint`, and the
   manual dev-mode pass.

The detailed implementation plan (with checkpoints) will be produced from this
spec.
