# Spotify Download Support via spotDL

**Date:** 2026-05-18
**Status:** Design — awaiting review
**Branch:** `main`

## Context

The Downloader is a Raycast extension that downloads video/audio (yt-dlp) and
image galleries (gallery-dl) from a single auto-routing `Download` command. This
adds a third content type: **Spotify** — paste an `open.spotify.com` track,
album, or playlist link and get audio files in the chosen folder.

This feature is not part of the existing macro plan (Fast Download, monolith,
Polished UX); it is a standalone addition prompted by a user request.

## Goals

- Paste an `https://open.spotify.com/...` link into the `Download` command and
  get audio files, with the same one-keypress tool-install UX as the other
  content types.
- Works on macOS and Windows.
- The dependency layer stops assuming "every CLI tool is a Homebrew formula".

## Non-goals (explicitly out of scope)

- No AI tool for Spotify — the `download-video` / `extract-transcript` tools in
  `src/tools/` are unchanged.
- No playlist subscription / auto-sync (a spooty feature). One-shot download
  only.
- No per-download bitrate control — YouTube is the audio source and caps
  quality regardless.
- No `spotify:` URI support — only `https://open.spotify.com/...` links (what
  Spotify's "Copy link" produces).

## Why spotDL, not spooty

The request originated from spooty (github.com/Raiper34/spooty). spooty is a
self-hosted web app (NestJS + Angular + Redis + SQLite, run via Docker) and
requires the user to register a Spotify developer app — the wrong shape for a
Raycast extension.

Its technique is standard, though: Spotify exposes no downloadable audio, so the
tool pulls track metadata from the Spotify API, finds the match on YouTube, and
downloads it with yt-dlp. spotDL (github.com/spotDL/spotify-downloader) is a
single CLI that does exactly that pipeline — metadata -> YouTube match ->
yt-dlp -> ffmpeg tags + art — and ships with built-in Spotify API credentials,
so no user-side developer account is needed.

Inherent, accepted limitation: audio is YouTube-sourced, so quality is capped
(~128 kbps; 256 kbps only with YouTube Music Premium cookies) — not lossless.

## The install-method problem

The three existing tools (yt-dlp, ffmpeg, gallery-dl) are all Homebrew formulae
(macOS) / winget packages (Windows). The dependency layer hardcodes this:
`binary.ts` defaults to `/opt/homebrew/bin/<name>`; `installer.tsx` runs
`brew install yt-dlp ffmpeg gallery-dl`; `updater.tsx` runs `brew info` /
`outdated` / `upgrade` on the same three.

spotDL is **not** a Homebrew formula (`brew info spotdl` -> none) and not a
winget package, so it cannot ride the existing flow unchanged.

Approaches considered:

- **A — pipx / pip.** `brew install pipx` + `pipx install spotdl` (macOS);
  Python + pip (Windows). Rejected: the Windows path is fragile — Python may be
  absent, and the resulting `spotdl.exe` lands in a version-dependent Scripts
  directory. Two divergent install flows.
- **B — extension-managed prebuilt binary (chosen).** spotDL publishes
  standalone executables on GitHub Releases. The extension downloads the
  platform-appropriate binary into Raycast's per-extension support directory.
  One identical mechanism on both platforms; no Python, no pipx; the extension
  owns the version.
- **C — detect-only, manual install.** Rejected: breaks the one-keypress
  auto-install UX every other tool has.

**Decision: B.** With macOS + Windows parity required, B is the only option that
yields a uniform, reliable experience on both platforms.

## Architecture — a tool registry

Introduce `lib/tools.ts`: a small, `@raycast/api`-free module that makes
explicit what is currently implicit — the set of CLI tools and, per tool, the
install method (`homebrew` / `winget` / `managed-binary`) for the current
platform. The path resolver, `Installer`, and `Updater` read the registry
instead of hardcoding tool lists.

**Uniform-flow principle.** The missing-binary flow is shared and unchanged:
detection via `fs.existsSync`, the `Installer` view, the press-Enter action, the
`onRefresh` re-detect. Only the *install action* dispatches on the registry —
`brew`/`winget` for the existing three, "download the prebuilt binary" for
spotdl. A missing spotdl looks identical to a missing gallery-dl.

spotDL's latest release is v4.5.0; it publishes one binary per platform —
`spotdl-<version>-darwin` (~41 MB) and `spotdl-<version>-win32.exe` (~44 MB).
There is no architecture split. The version is in the filename, so the download
URL is resolved via the GitHub `releases/latest` API rather than hardcoded.

## Components

### New files

- **`lib/tools.ts`** — the tool registry: each CLI tool with its
  platform-resolved install method. ffprobe is bundled with the ffmpeg
  formula, so it is detected and resolved but is not a separate install or
  update entry (as today). No `@raycast/api` import.
- **`lib/managed-binary.ts`** — download / locate / version logic for
  extension-managed binaries:
  - `resolveSpotdlAsset(platform, assetNames)` — pure, testable: picks the
    `*-darwin` asset on macOS, `*-win32.exe` on Windows.
  - `getLatestRelease()` — fetches the `releases/latest` JSON (version tag +
    asset URLs).
  - `downloadSpotdl(supportDir, onProgress)` — streams the asset to a temp
    path, moves it into `<supportDir>/spotdl` (`.exe` on Windows) atomically on
    success, `chmod +x` on macOS, ad-hoc code-signs if an unsigned binary will
    not run on Apple Silicon.
  - `getInstalledVersion(spotdlPath)` — runs `spotdl --version`, for the
    Updater.

  `supportDir` is a parameter so the pure parts stay testable; callers pass
  `environment.supportPath`.
- **`lib/spotdl.ts`** — the spotDL CLI wrapper, mirroring `lib/gallerydl.ts`.
  No `@raycast/api` import.
  - `buildSpotdlArgs(options)` — pure: builds `spotdl download <url> --output
    "<destination>/{artists} - {title}.{output-ext}" --format <fmt> --ffmpeg
    <path>`.
  - `runSpotdlDownload(binaryPath, options, onProgress)` — spawns spotdl,
    counts completed-track lines from stdout for progress, resolves with the
    track count or rejects with stderr.
- **`views/spotify-form.tsx`** — the Spotify download form, mirroring
  `views/gallery-form.tsx`: URL field + destination file picker + the shared
  3-item type dropdown. Checks two binaries — `spotdl` and `ffmpeg` — and
  renders the `Installer` for whichever is missing. On submit, calls
  `runSpotdlDownload` with a track-count progress toast and an "Open Folder"
  action on success.
- **`tests/spotdl.test.ts`**, **`tests/managed-binary.test.ts`** — unit tests
  for the pure logic.

### Modified files

- **`types.ts`** — `SourceType` gains `"spotify"`.
- **`lib/detect.ts`** — a `SPOTIFY_DOMAINS` entry (`open.spotify.com`); a
  matching host returns `"spotify"`.
- **`lib/binary.ts`** — `resolveBinary` gains an optional `managedDir`
  parameter: a user preference override still wins; otherwise a managed tool
  resolves to `<managedDir>/<name>` (`.exe` on Windows). Stays
  `@raycast/api`-free.
- **`utils.ts`** — adds `getSpotdlPath()` (passes `environment.supportPath` as
  `managedDir`); reads the two new preferences.
- **`index.tsx`** — three-way routing: `spotify` -> `<SpotifyForm>`, `gallery`
  -> `<GalleryForm>`, else `<VideoForm>`.
- **`views/video-form.tsx`**, **`views/gallery-form.tsx`** — add a "Spotify"
  item to the type dropdown.
- **`views/installer.tsx`** — install-method-aware: a `managed-binary` tool
  shows a "Download spotDL (~40 MB)" action calling `downloadSpotdl`;
  brew/winget tools keep the existing flow.
- **`views/updater.tsx`** — iterates the registry: brew/winget tools keep the
  existing version checks; spotdl compares `getInstalledVersion` against the
  version from `getLatestRelease()` (showing "not installed" when the binary
  is absent), and "Upgrade" re-downloads.
- **`package.json`** — two new preferences (below); minor `description` /
  `keywords` update to mention music.
- **`tests/detect.test.ts`**, **`tests/binary.test.ts`** — extended for the new
  behavior.
- **`SUPPORTED_SITES.md`**, **`README.md`** — mention Spotify.

## Data flow — first Spotify download

1. The user opens `Download` and selects the "Spotify" type, or pastes an
   `open.spotify.com` link that `detect.ts` auto-routes to `"spotify"`.
2. `SpotifyForm` resolves `spotdlPath` to `<supportPath>/spotdl`;
   `fs.existsSync` is false.
3. The form renders `<Installer executable="spotdl" />`.
4. `Installer` reads the registry — spotdl's method is `managed-binary` — and
   shows a "Download spotDL (~40 MB)" action.
5. Enter -> `downloadSpotdl(environment.supportPath)`: fetch the latest release
   JSON, pick `spotdl-<version>-darwin`, stream it to a temp file with a
   progress toast, move it into place, `chmod +x`.
6. `onRefresh()` re-runs detection; the binary now exists; `SpotifyForm`
   renders.
7. The user enters a URL + destination and submits -> `runSpotdlDownload`
   spawns spotdl (`--ffmpeg` pointed at the extension's resolved ffmpeg) ->
   track-count progress toast -> "Open Folder" on success.

If ffmpeg is missing, the Spotify form's ffmpeg check triggers the existing
`brew install` Installer first.

## package.json changes

- The command stays a single command (`index`, title "Download").
- New preferences:
  - `spotDlPath` — textfield, optional manual override of the spotdl binary
    path (mirrors `galleryDlPath`).
  - `spotifyAudioFormat` — dropdown: MP3 (default), M4A, Opus, FLAC. A
    per-content-type download default, consistent with the existing
    per-content-type preferences (`videoMediaType`, `audioFormat`, ...).
- Minor `description` / `keywords` update to mention music / Spotify.

## Error handling

- Tool not installed -> the `Installer` for that specific tool (spotdl ->
  download; ffmpeg -> brew).
- Binary download failure (network, GitHub unreachable, API rate limit) -> a
  failure toast with copy-to-clipboard + a retry action, matching
  `installer.tsx`'s existing failure pattern.
- Interrupted download -> the binary is streamed to a temp path and moved into
  place only on success, so a killed download never leaves a half-written
  binary at the resolved path.
- No matching release asset for the platform -> a defensive error (should not
  occur; both assets are published).
- spotdl exits non-zero (a track unavailable, network) -> `runSpotdlDownload`
  rejects with stderr; the form shows a failure toast — same pattern as the
  gallery form.
- Invalid / empty URL -> form validation error.

## Testing

- **Unit** (vitest, pure modules only — consistent with the existing `tests/`):
  - `spotdl.test.ts` — `buildSpotdlArgs` for each format and with the ffmpeg
    path.
  - `managed-binary.test.ts` — `resolveSpotdlAsset` picks the correct
    per-platform asset.
  - `detect.test.ts` — Spotify links route to `"spotify"`; existing routing
    unaffected.
  - `binary.test.ts` — `resolveBinary` with `managedDir`; preference-override
    precedence.
- Views and the fetch/fs code are not unit-tested — consistent with the rest of
  the project.
- **Manual:** download a single track and a small playlist; verify the
  first-run binary download + auto-refresh.
- **Verification:** `npm run build`, `npm run lint`, `npm test`. Per project
  gotchas: `raycast-env.d.ts` is generated — run `npm run build` once before
  trusting preference types; `ray lint` flags the pre-existing `author` field,
  unrelated to this work.

## Indicative build sequence

1. Add `lib/tools.ts` (the registry) and extend `lib/binary.ts` with
   `managedDir`; update `utils.ts` (`getSpotdlPath`) and `binary.test.ts`.
2. Add `lib/managed-binary.ts` (asset resolution, release fetch, download,
   version) + `managed-binary.test.ts`.
3. Add `lib/spotdl.ts` (arg-builder + runner) + `spotdl.test.ts`.
4. Add `"spotify"` to `types.ts`; extend `lib/detect.ts` + `detect.test.ts`.
5. Add `views/spotify-form.tsx`; wire three-way routing in `index.tsx`; add the
   "Spotify" dropdown item to the video and gallery forms.
6. Make `views/installer.tsx` and `views/updater.tsx` install-method-aware.
7. `package.json`: the two preferences + description/keywords; update
   `SUPPORTED_SITES.md` / `README.md`.

## Implementation notes (verify during build)

- spotDL's exact stdout format for completed-track lines — run it once to
  finalize the progress regex in `runSpotdlDownload` (the gallery-dl wrapper
  uses the same line-counting estimate).
- Whether the macOS release binary is ad-hoc signed — if not, `downloadSpotdl`
  must ad-hoc sign it post-download so it runs on Apple Silicon.

The detailed implementation plan (with checkpoints) will be produced from this
spec.
