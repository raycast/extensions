# Architecture

MediaFlow reads "now playing" state from macOS and exposes it through three Raycast
commands and two AI tools. This document describes how sources are discovered,
merged, and controlled, and the platform limits that shaped the design.

## Provider registry

Every app-specific integration implements the `SourceProvider` interface
(`src/core/types.ts`): `isAvailable()`, `getSource()`, an optional `control()`, and a
`capabilities` flag set (`control`, `artwork`, `seek`). Providers are plain objects
registered once, in order, via `registerProvider()` (`src/core/registry.ts`) from
`registerAllProviders()` (`src/core/setup.ts`), which every command and tool entry
point calls before touching media state. The registry is a flat array keyed by
provider `id`; `findProviderForBundle()` looks a provider up by the bundle id it
declares it can enrich or control. Registration is idempotent — a duplicate `id` is
silently ignored — so calling `registerAllProviders()` from multiple command
lifecycles is safe.

## Primary engine + AppleScript enrichment

`getMediaSources()` (`src/core/mediaService.ts`) is the orchestrator every command and
tool calls. It runs two things concurrently:

1. **`media-control` CLI** (`src/providers/mediaControl.ts`), the primary engine. It
   shells out to the `media-control` binary (see below) and covers *any* app
   registered with the macOS Now Playing service — Music, Spotify, TIDAL, Deezer,
   Amazon Music, VLC, browsers, podcast apps — with title, artist, album, duration,
   elapsed position, playback state, bundle id, and base64 artwork.
2. **Registered providers** (`src/providers/*.ts`), run in parallel via
   `Promise.all`, each independently guarded so one provider throwing never fails the
   others (`.catch(() => null)` per provider).

Both sets of results are merged by bundle id (falling back to provider `id` when no
bundle id is known — see `keyOf()`). Where `media-control` and a provider agree on the
same app, the provider's fields win when defined (via a `defined()` helper that strips
explicit `undefined` so a provider's partial result can never clobber a field it
doesn't know), `isPlaying` is OR'd across both, and artwork prefers whichever source
already resolved a local path. This is deliberate: `media-control` is the coverage
floor, AppleScript is the enrichment layer for the two apps with usable dictionaries.
The merged list is sorted playing-first, then pinned-source-first, then alphabetically
by app name.

Playback control (`controlSource()`) looks up the owning provider by bundle id; if
that provider declares `capabilities.control` and exposes `control()`, the command is
routed there (e.g. Music.app and Spotify AppleScript control). Otherwise control falls
back to `media-control`'s own control surface. This means an app with no AppleScript
dictionary (TIDAL, Deezer, Amazon Music, Firefox) is still controllable as long as
`media-control` supports transport commands for it.

## Why `media-control` and not MediaRemote directly

Apple's private `MRMediaRemoteGetNowPlayingInfo` API is entitlement-gated as of macOS
15.4 — a normal, non-Apple-signed process can no longer call it directly. The
`media-control` CLI (ungive/mediaremote-adapter) works around this by driving the
Now Playing service through a Perl process granted the legacy `com.apple.perl5` trust
model, with no SIP disable required. It is maintained through macOS 26 but is not part
of macOS itself — it is an optional Homebrew install (`brew install media-control`)
and Apple could close the loophole in any future point release. The architecture
treats it as a best-effort primary, never a hard dependency.

## Degraded mode

If `media-control` is missing or errors, `mediaControlProvider.isAvailable()` resolves
false and `getSource()` resolves null (both `.catch()`-guarded in
`getMediaSources()`), so `engineAvailable` on the returned `MediaSnapshot` flips to
`false`. Coverage silently narrows to whatever AppleScript-capable providers are
installed and running (Music, Spotify, Safari/Chrome tab titles) — nothing throws, no
command crashes. The menu-bar command surfaces an install hint pointing at
`brew install media-control` when running in this state.

## Audio devices

`src/audio/devices.ts` lists and switches macOS audio devices by spawning the
`audio-devices` CLI binary from the `macos-audio-devices` npm package directly via
`execSafe`, rather than importing that package's JS wrapper
(`import("macos-audio-devices")`). The wrapper resolves its binary's path relative to
its own module directory inside `node_modules`; `ray build` bundles the extension into
a single file with a different runtime layout, so that relative path resolves to
nothing once built, every call rejects, and the Audio Devices view silently shows "No
Results". The fix vendors the binary at `assets/audio-devices` (copied verbatim,
unmodified, MIT licensed) and resolves it at runtime via `environment.assetsPath`,
falling back to the `node_modules` copy for unit tests/dev scripts and finally to a
bare `audio-devices` lookup on `PATH`. The `macos-audio-devices` npm dependency stays
in `package.json` as the source of truth for the binary (provenance, license, updates)
and as that dev/test fallback, even though its JS wrapper is never imported.

## Artwork cache

`cacheArtwork()` (`src/core/artworkCache.ts`) persists base64 artwork to a file under
`environment.supportPath/artwork`, keyed by a SHA-1 hash of a caller-supplied cache
key so repeated writes for the same track are idempotent. Files are considered fresh
for a **1 hour TTL** — a cache hit within that window returns the existing path
without rewriting the file. `MediaSource.artworkPath` is always a local file path by
the time a command renders it; nothing renders a remote URL as artwork directly.

## AI features

The `src/tools/*.ts` AI tools (`get-now-playing`, `control-playback`) are invoked
by the user through Raycast AI chat or Quick AI, or by the AI itself — there is
no MediaFlow UI element that triggers them.

## Platform constraints (why the UI looks the way it does)

| Constraint | Detail |
| --- | --- |
| No slider component | Raycast has no Slider primitive. Progress and volume render via `getProgressIcon()` (a static circular icon) plus discrete menu items (25/50/75/100%, etc). |
| `MenuBarExtra` is a native NSMenu | Only `Item`, `Submenu`, `Section`, and `Separator` exist — no custom row layout, inline buttons, progress bars, or multi-line rows. |
| Read-only preferences | `getPreferenceValues()` reads `package.json`-declared preferences at runtime; they cannot be mutated from code. Runtime state (pinned source, etc.) lives in `LocalStorage` instead. |
| Minimum background interval | `menu-bar` command background refresh cannot go below 10s; MediaFlow defaults to `1m`. While the menu is open, an in-process interval can poll faster for live position updates, but it stops the moment the menu closes. |

These constraints are why the rich UI (large artwork, detailed metadata panel) lives
in the `mediaDetails` view command rather than the menu bar, and why control is
button/menu-item driven rather than slider driven.
