# Section 3 — monolith (Webpage Saving)

**Date:** 2026-05-19
**Status:** Design — awaiting review
**Branch:** `main`

## Context

The Downloader is a Raycast extension that downloads video/audio (yt-dlp), image
galleries (gallery-dl), and Spotify music (spotDL) from two commands: an
auto-routing `Download` **view** command and an argument-driven `Fast Download`
**no-view** command. Section 1 added a typed download-defaults layer
(`lib/config.ts`); Section 2 (Fast Download) consumed it.

This is **Section 3** of `docs/superpowers/macroplan.md`: **monolith** — a fourth
download method. Paste a URL that is not a known video / gallery / music site and
it is saved as a single self-contained `.html` file. This makes the
`webpageSaveMode` preference — declared inert by Section 1 — functional.

monolith (github.com/Y2Z/monolith) is a Rust CLI that retrieves a page and
embeds every asset (CSS, images, JavaScript, fonts) into one HTML5 document that
renders offline exactly as it appeared online. It is self-contained — no runtime
dependency on ffmpeg or any other tool.

## Goals

- A new `"webpage"` source type. A plain webpage URL routes to monolith from both
  the `Download` command and `Fast Download`.
- `monolith` is wired into the tool registry, the installer, and the updater —
  on macOS and Windows — with the same one-keypress install UX as the other tools.
- `webpageSaveMode` (Complete / Lightweight) becomes functional — Complete embeds
  everything, Lightweight strips JavaScript.
- The `Download` command's webpage form lets the user pick the save mode per
  download; Fast Download uses the preference default.
- Works on macOS and Windows.
- The pure logic added is covered by unit tests.

## Non-goals (explicitly out of scope)

- **A separate command.** Webpage saving lives inside the existing `Download` and
  `Fast Download` commands — no third command.
- **Auto-routing accuracy beyond a domain allowlist.** Resolved in the brainstorm:
  routing is allowlist-based (below). A video on a site absent from `VIDEO_DOMAINS`
  is saved as a webpage rather than having its video extracted. Section 4's planned
  user-overridable `method` field is the proper fix for correcting a wrong guess; a
  yt-dlp probe-then-fallback was considered and rejected (it adds a slow probe
  before every webpage save and breaks Fast Download's no-pre-fetch speed).
- **monolith's other strip flags** (`--no-css`, `--no-images`, `--no-fonts`,
  `--no-frames`, MHTML output, isolation). Only the two modes Section 1 defined —
  Complete and Lightweight — are exposed.
- **Page-title-based filenames.** The saved file is named from the URL (below);
  monolith cannot template filenames, and a URL slug needs no extra fetch/parse.
- **Recursive / multi-page crawling.** monolith saves the single target page.
- **Login-gated pages / cookie passing.** monolith's `--cookies` is not wired —
  consistent with this section staying minimal.
- **AI tools.** `src/tools/` is unchanged.
- Per-content-type download folders — the shared `downloadPath` is kept.

## Routing — the allowlist inversion

`detectSource(url)` in `lib/detect.ts` is a pure URL → `SourceType` map. Today it
checks `SPOTIFY_DOMAINS`, then `GALLERY_DOMAINS`, and defaults **everything else to
`"video"`** — there is no video allowlist; yt-dlp's generic extractor is the
catch-all.

A webpage is the *general* case, so it cannot be a domain list. For Fast Download
(no form) to ever save a webpage, `detectSource` must classify some URLs as
`"webpage"`. The resolution, confirmed in the brainstorm: **add an explicit
`VIDEO_DOMAINS` allowlist and flip the fallthrough from `"video"` to `"webpage"`.**

```
SPOTIFY_DOMAINS → "spotify"
GALLERY_DOMAINS → "gallery"
VIDEO_DOMAINS   → "video"
(anything else) → "webpage"
```

`VIDEO_DOMAINS` (initial set, tunable): `youtube.com`, `youtu.be`, `vimeo.com`,
`twitch.tv`, `tiktok.com`, `x.com`, `twitter.com`, `dailymotion.com`,
`bilibili.com`, `facebook.com`, `soundcloud.com`, `streamable.com`.

Accepted trade-off: yt-dlp supports ~1800 sites; this allowlist is far shorter, so
a video on an unlisted site is saved as static HTML. The `Download` command's form
makes the misroute visible (it states the page will be saved with monolith);
Section 4's `method` override is the planned correction path.

The `if (!host) return "video"` early return is removed — an unparseable host
matches no list and harmlessly falls through to `"webpage"`.

## Architecture

```
src/
  index.tsx          MODIFIED — adds the `webpage` → <WebpageForm> route
  fast-download.ts   MODIFIED — adds the `webpage` branch
  types.ts           MODIFIED — SourceType gains "webpage"
  utils.ts           MODIFIED — getMonolithPath(); removes dead MP3_FORMAT_ID
  lib/
    detect.ts        MODIFIED — VIDEO_DOMAINS allowlist; fallthrough → "webpage"
    tools.ts         MODIFIED — `monolith` tool; per-tool `wingetId`
    monolith.ts      NEW — monolith CLI wrapper (arg-builder, filename, runner)
    config.ts        (unchanged) — getConfig() already exposes webpageSaveMode
  views/
    webpage-form.tsx NEW — the webpage download form
    installer.tsx    MODIFIED — Windows install dispatches on the registry
    updater.tsx      MODIFIED — registry-driven version checks (macOS + Windows)
tests/
  monolith.test.ts   NEW — buildMonolithArgs, webpageFilename, runMonolithSave
  detect.test.ts     MODIFIED — video-domain and webpage routing
package.json         MODIFIED — monolithPath preference; description/keywords
README.md            MODIFIED — webpage saving + monolith
SUPPORTED_SITES.md   MODIFIED — a Webpages section
CHANGELOG.md         MODIFIED — a release entry
ABOUT.md             MODIFIED — mention monolith
```

## Components

### New files

#### `src/lib/monolith.ts`

The monolith CLI wrapper, mirroring `lib/gallerydl.ts` / `lib/spotdl.ts`. Pure and
`@raycast/api`-free, so it is unit-testable.

- **`MonolithSaveOptions`** — `{ url: string; outputPath: string; noJavaScript: boolean }`.
  `outputPath` is the full path to the `.html` file to write; `noJavaScript` true
  selects Lightweight mode.
- **`buildMonolithArgs(o: MonolithSaveOptions): string[]`** — pure. Returns
  `["--output", o.outputPath, ...(o.noJavaScript ? ["--no-js"] : []), o.url]`.
  Complete mode is monolith's default (no extra flag); Lightweight adds `--no-js`.
- **`webpageFilename(url: string): string`** — pure. Derives a filesystem-safe
  `.html` filename from the URL's host + path + query. `new URL()` is used (with an
  `https://` prefix added when the input has no protocol); a leading `www.` is
  stripped; path separators and characters unsafe on macOS/Windows
  (`` / \ ? % * : | " < > = & `` and whitespace) are replaced with `-`; runs of `-`
  are collapsed; leading/trailing `-` are trimmed; the result is truncated to 150
  characters; an empty result falls back to `webpage`. Examples:
  `https://en.wikipedia.org/wiki/Raycast` → `en.wikipedia.org-wiki-Raycast.html`;
  `https://news.ycombinator.com/item?id=12345` →
  `news.ycombinator.com-item-id-12345.html`; `https://example.com/` →
  `example.com.html`. Re-saving the same URL yields the same name and overwrites —
  an accepted, predictable behavior (no collision counter).
- **`MonolithResult`** — `{ filePath: string }`.
- **`runMonolithSave(binaryPath: string, options: MonolithSaveOptions): Promise<MonolithResult>`**
  — `spawn`s monolith with `buildMonolithArgs(options)`, accumulates **stderr**,
  resolves `{ filePath: options.outputPath }` on a zero exit, and rejects with
  `new Error(stderr.trim() || "monolith exited with code <code>")` on a non-zero
  exit or rejects on a spawn `error`. monolith writes the file itself via
  `--output`, so the runner does not touch the filesystem. There is **no
  `onProgress` callback** — monolith emits no parseable progress; callers show an
  indeterminate animated Toast. This is a deliberate asymmetry with the other three
  runners.

#### `src/views/webpage-form.tsx`

The webpage download form, exporting `WebpageForm`. Mirrors
`views/gallery-form.tsx`. Props: `{ url: string; onUrlChange: (newUrl: string) => void }`.

It resolves `monolithPath` via `getMonolithPath()` and, if `fs.existsSync` is
false, renders `<Installer executable="monolith" onRefresh={…} />` — the shared
missing-tool flow.

Form fields:

- **`Form.Description`** — title "Save as Webpage", text explaining that the URL is
  not a video, gallery, or music source and will be saved as a single
  self-contained `.html` file with monolith. This makes the routing decision
  visible to the user.
- **`Form.TextField`** `id="url"` — the URL, `defaultValue={url}`, `onChange`
  wired to `onUrlChange` (so re-detection can re-route if the user edits the URL).
- **`Form.Dropdown`** `id="saveMode"` title "Save Mode" — items *Complete* (value
  `complete`) and *Lightweight (no JavaScript)* (value `lightweight`),
  `defaultValue` from the `webpageSaveMode` preference. A per-download override of
  the preference default; gallery/Spotify forms have no equivalent, but the
  webpage form deliberately exposes the choice.
- **`Form.FilePicker`** `id="destination"` — a single directory, `defaultValue`
  `[downloadPath]`.

On submit: `destination = values.destination[0] ?? downloadPath`;
`outputPath = path.join(destination, webpageFilename(values.url))`. Show an
animated Toast ("Saving Webpage"), call `runMonolithSave(monolithPath, { url,
outputPath, noJavaScript: values.saveMode === "lightweight" })`. On success the
Toast turns green ("Webpage Saved", the file name) with a `primaryAction` "Open
Folder" (`open(destination)`) and a `secondaryAction` "Open File"
(`open(filePath)` — opens the saved `.html`). On a rejected runner: a Failure
Toast with the error message.

### Modified files

#### `src/types.ts`

`SourceType` gains `"webpage"`: `"video" | "gallery" | "spotify" | "webpage"`.

#### `src/lib/detect.ts`

Adds the `VIDEO_DOMAINS` array (above). `detectSource` checks Spotify, then
gallery, then video, and returns `"webpage"` for anything else; the `if (!host)`
early return is deleted. The function's doc comment is updated to describe the
four-way routing and the allowlist fallthrough.

#### `src/lib/tools.ts`

- `ToolId` gains `"monolith"`.
- `ToolSpec` gains an optional **`wingetId?: string`** — the winget package
  identifier, used by the Windows installer.
- `TOOLS` gains `monolith: { id: "monolith", installMethod: packageManagerMethod, wingetId: "Y2Z.Monolith" }`,
  and `wingetId` is filled in for the existing winget-installable tools:
  `yt-dlp` → `yt-dlp.yt-dlp`, `gallery-dl` → `mikf.gallery-dl`,
  `deno` → `DenoLand.Deno`. `ffmpeg` carries no `wingetId` — Windows yt-dlp bundles
  ffmpeg/ffprobe, so the installer falls back to yt-dlp's package for them (below).
  `spotdl` carries no `wingetId` (it is a managed binary).
- `HOMEBREW_FORMULAE` is unchanged in code; because it is derived from `TOOLS`, it
  now also yields `monolith` — the macOS installer and updater pick monolith up
  automatically.
- A new derived export **`WINGET_PACKAGES`** — the distinct winget package IDs of
  the registry's winget tools (`Object.values(TOOLS)` filtered to
  `installMethod === "winget"` with a `wingetId`). Analogous to `HOMEBREW_FORMULAE`:
  non-empty on Windows (`yt-dlp.yt-dlp`, `mikf.gallery-dl`, `DenoLand.Deno`,
  `Y2Z.Monolith`), empty on macOS. The updater's Windows path reads it.

#### `src/utils.ts`

- The `getPreferenceValues` destructure gains `monolithPath: monolithPathPreference`.
- Adds `export const getMonolithPath = () => resolveBinary("monolith", monolithPathPreference);`
  next to `getGalleryDlPath`. monolith is a package-manager tool, so no `managedDir`
  argument — unlike `getSpotdlPath`.
- Removes the now-unused `export const MP3_FORMAT_ID = "bestaudio#mp3";` constant
  (dead since Section 2 generalized the yt-dlp audio branch). The build sequence
  verifies no other module imports it.

#### `src/index.tsx`

Adds one route before the `VideoForm` fallthrough:

```tsx
if (type === "webpage") {
  return <WebpageForm url={url} onUrlChange={handleUrlChange} />;
}
```

and the `WebpageForm` import. Nothing else changes; the existing URL
state / auto-load / `handleUrlChange` re-detection already produce the
`"webpage"` type.

#### `src/fast-download.ts`

Adds `webpageSaveMode` to the `getPreferenceValues` destructure, imports
`getMonolithPath`, `runMonolithSave`, and `webpageFilename`, and adds a `webpage`
branch (the spec for Section 2 left routing open for exactly this — it is one more
branch):

```ts
if (type === "webpage") {
  const monolithPath = getMonolithPath();
  if (!fs.existsSync(monolithPath)) return handOff("monolith", url);

  const outputPath = path.join(downloadPath, webpageFilename(url));
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving Webpage" });
  try {
    const { filePath } = await runMonolithSave(monolithPath, {
      url,
      outputPath,
      noJavaScript: webpageSaveMode === "lightweight",
    });
    toast.style = Toast.Style.Success;
    toast.title = "Saved";
    toast.message = path.basename(filePath);
    toast.primaryAction = { title: "Open Folder", onAction: () => open(downloadPath) };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Save Failed";
    toast.message = errorMessage(error);
    toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(errorMessage(error)) };
  }
  return;
}
```

It uses the existing `handOff` (a missing tool launches the `Download` command
with the URL in `launchContext`) and `errorMessage` helpers.

#### `src/views/installer.tsx`

monolith's `installMethod` is `homebrew`/`winget` (not `managed-binary`), so
`isManagedTool("monolith")` is false and the `Installer` renders `AutoInstall` —
no change to `ManagedInstall` or `lib/managed-binary.ts` (those stay spotDL-only).

`AutoInstall`'s Windows branch currently hard-codes `--id=yt-dlp.yt-dlp`
regardless of which tool is missing — a pre-existing bug that already mis-installs
for gallery-dl/deno. monolith, a winget tool, cannot dodge this the way spotDL did.
Fix:

- `AutoInstall` gains an **`executable: string`** prop (today it receives only
  `onRefresh`); `Installer` passes the `executable` it already holds.
- The Windows branch installs `TOOLS[executable]?.wingetId ?? "yt-dlp.yt-dlp"` —
  the requested tool's package, falling back to `yt-dlp.yt-dlp` for `ffmpeg` and
  `ffprobe` (which carry no `wingetId` — Windows yt-dlp bundles them) and any
  executable not in the registry. The hard-coded yt-dlp-specific "already
  installed" success message and the `windowsInstallGuide` markdown (the
  `winget install` command and the "yt-dlp bundles ffmpeg" note) are generalized
  to the `executable` / its `wingetId`.
- The macOS branch is unchanged: it installs all `HOMEBREW_FORMULAE` in one
  `brew install` (idempotent, existing behavior) — which now includes monolith.

#### `src/views/updater.tsx`

Both platforms' version-check paths become registry-driven, so monolith is
checked and upgraded on macOS and Windows alike.

- **macOS.** `getVersions`, `getOutdated`, and `upgrade` hard-code
  `["yt-dlp", "ffmpeg", "gallery-dl", "deno"]`; they switch to `HOMEBREW_FORMULAE`,
  which now includes `monolith`.
- **Windows.** The branch checks only `yt-dlp.yt-dlp` today. It switches to a loop
  over `WINGET_PACKAGES`, keeping the existing winget commands and version regex
  unchanged and only parameterizing the package id: `getVersions` runs
  `winget list --id <pkg> --exact` per package; `getOutdated` scans the single
  `winget upgrade` output for each package id; `upgrade` runs
  `winget upgrade --id <pkg> …` per package, each wrapped so an already-current
  package does not abort the rest. `parseWingetVersion` takes the package id
  instead of the literal `"yt-dlp"`. This also brings gallery-dl and deno —
  previously unchecked on Windows — into the updater.
- The `versions` / `outdated` state objects' initial shape is derived from
  `HOMEBREW_FORMULAE` on macOS / `WINGET_PACKAGES` on Windows, each plus `spotdl`,
  instead of the hard-coded literals.

## Data flow — a first webpage save (`Download` command)

1. The user opens `Download` and pastes a plain article URL. `handleUrlChange`
   runs `detectSource` → the URL matches no Spotify/gallery/video domain →
   `"webpage"`.
2. `index.tsx` renders `<WebpageForm>`. It resolves `monolithPath`;
   `fs.existsSync` is false.
3. The form renders `<Installer executable="monolith" />`. `isManagedTool` is
   false → `AutoInstall`. On macOS, Enter runs `brew install` of all
   `HOMEBREW_FORMULAE` (monolith included); on Windows, `winget install --id=Y2Z.Monolith -e`.
4. `onRefresh()` re-detects; `monolithPath` now exists; `WebpageForm` renders.
5. The user keeps or changes **Save Mode** (defaulted from `webpageSaveMode`),
   picks a destination, and submits.
6. `outputPath = <destination>/<webpageFilename(url)>`; an animated "Saving
   Webpage" Toast shows; `runMonolithSave` spawns monolith
   (`--output <outputPath> [--no-js] <url>`).
7. monolith exits 0; the Toast turns green — "Webpage Saved", the file name, with
   **Open Folder** and **Open File** actions.

Fast Download follows the same shape without the form: `detectSource` → `webpage`
→ missing-tool hand-off or `runMonolithSave` with the `webpageSaveMode` preference.

## Error handling

- **monolith not installed** — the `Download` command renders the `Installer`
  (brew on macOS, the tool-specific winget install on Windows). Fast Download, a
  no-view command, cannot render a view, so it shows a Failure Toast and hands off
  to the `Download` command via `handOff("monolith", url)` — the existing Section 2
  pattern.
- **monolith exits non-zero** (unreachable host, HTTP error, a write failure in
  the destination) — `runMonolithSave` rejects with stderr; the form / command
  shows a Failure Toast with a copy-error action, matching the gallery and Spotify
  flows.
- **Invalid / empty URL** — Fast Download's `isValidUrl` guard already catches it
  before routing; the `Download` form's field accepts the typed value and a bad
  URL surfaces as a monolith failure.
- **Unparseable host** — `detectSource` returns `"webpage"`; monolith fails
  cleanly on the bad URL → Failure Toast.

## package.json changes

- A new preference **`monolithPath`** — textfield, optional, a manual override of
  the monolith binary path. Mirrors `galleryDlPath` / `spotDlPath`; placed in the
  executable-paths group. Description: a `which monolith` hint.
- `webpageSaveMode`'s description drops its "(used by a later release)" clause —
  it is functional as of this section.
- `description` and `keywords` mention webpages (e.g. add `webpage`, `monolith`,
  `html` to keywords); the `index` command's `description` adds "webpages".
- No new dropdown preference — `webpageSaveMode` already exists from Section 1.

`raycast-env.d.ts` (generated, gitignored) regenerates on `npm run build` to
include `monolithPath`.

## Testing

Unit tests only, vitest, pure modules — consistent with the existing `tests/`.

- **`tests/monolith.test.ts`** (new):
  - `buildMonolithArgs` — Complete mode omits `--no-js`; Lightweight mode includes
    it; `--output` carries the output path; the URL is last.
  - `webpageFilename` — host+path+query inputs map to the expected safe `.html`
    names; a root URL, a URL with a query string, and a no-protocol input are
    covered; the 150-char truncation and the `webpage` fallback are exercised.
  - `runMonolithSave` — mock `node:child_process` (as `tests/spotdl.test.ts`
    does): `close 0` resolves `{ filePath }`; stderr text + `close 1` rejects with
    that text.
- **`tests/detect.test.ts`** (extended) — a `VIDEO_DOMAINS` host → `"video"`; an
  unknown host → `"webpage"`; Spotify and gallery routing still hold; a bare
  hostname with no protocol still classifies.
- Views, the registry, and process glue are verified by `npm run build` and the
  manual dev pass — consistent with the rest of the project.
- **Verification:** `npm test`, `npm run build`, `npm run lint`. Per project
  gotchas: `raycast-env.d.ts` is generated — run `npm run build` once before
  trusting `monolithPath`'s preference type; `ray lint` flags the pre-existing
  `author` field, unrelated to this work.
- **Manual:** save a plain article URL in Complete and in Lightweight mode and
  confirm each `.html` opens offline; run Fast Download on a webpage URL; with
  monolith uninstalled, confirm the first-run install + auto-refresh. The Windows
  winget installer and updater branches need a separate verification pass on
  Windows (see Implementation notes).

## Indicative build sequence

1. `lib/tools.ts` — add the `monolith` entry and `wingetId` to every winget tool.
2. `types.ts` + `lib/detect.ts` — add `"webpage"`, the `VIDEO_DOMAINS` allowlist,
   and the fallthrough flip; extend `tests/detect.test.ts` (test-first).
3. `lib/monolith.ts` — the arg-builder, `webpageFilename`, and the runner; new
   `tests/monolith.test.ts` (test-first).
4. `utils.ts` — add `getMonolithPath`; remove `MP3_FORMAT_ID`.
5. `views/webpage-form.tsx`; wire the `webpage` route into `index.tsx`.
6. `fast-download.ts` — the `webpage` branch.
7. `views/installer.tsx` (registry-driven Windows install) and `views/updater.tsx`
   (registry-driven version checks — `HOMEBREW_FORMULAE` on macOS,
   `WINGET_PACKAGES` on Windows).
8. `package.json` — the `monolithPath` preference, the `webpageSaveMode`
   description, `description`/`keywords`; `npm run build` to regenerate
   `raycast-env.d.ts`.
9. `README.md`, `SUPPORTED_SITES.md`, `CHANGELOG.md`, `ABOUT.md`.

## Implementation notes (verify during build)

- **monolith flag spelling.** The README option table documents the short flags
  `-o` (output) and `-j` (exclude JavaScript). This spec uses the long forms
  `--output` / `--no-js` for readability — confirm both exist via
  `monolith --help` during the build; fall back to `-o` / `-j` if not.
- **`--output` writes the file.** Confirm monolith with `--output <path>` writes
  the `.html` to that path (rather than requiring stdout redirection), so
  `runMonolithSave` need not capture stdout.
- **Non-zero exit on failure.** Confirm monolith exits non-zero on an unreachable
  host / HTTP error, so `runMonolithSave` rejects rather than resolving with an
  empty file.
- **winget "already installed" exit code.** `installer.tsx` special-cases winget
  exit code `2316632107` ("already installed") for yt-dlp — confirm it generalizes
  to the per-tool install and update the success message accordingly.
- **Windows updater generalization.** The `WINGET_PACKAGES` loop in `updater.tsx`
  keeps the existing winget commands and the `(\d+\.)+\d+` version regex verbatim —
  only the package id is parameterized. It cannot be exercised on macOS; verify
  `winget list` / `winget upgrade` parsing on Windows, including a package that is
  already up to date.
- **`webpageFilename` on Windows.** Confirm trailing dots/spaces are not produced
  before the `.html` extension (Windows rejects trailing dots in filenames).

## Git

`macroplan.md` describes "merge to `develop`", but recent work — Section 1's tail,
the off-plan Spotify feature, and Section 2 — landed directly on `main`, and
`develop` trails. Section 3 follows suit and **commits to `main`** — to be
re-confirmed with the user before the first commit, per their standing request.

The detailed implementation plan (with checkpoints) will be produced from this
spec.
