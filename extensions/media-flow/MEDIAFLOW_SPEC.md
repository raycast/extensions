# MediaFlow — Raycast Extension Spec (v2, reality-checked 2026-07-11)

**Project Name:** MediaFlow
**Description:** A universal, open-source now-playing monitor and audio device switcher for macOS, living in the Raycast menu bar.
**Repo:** https://github.com/egor-xyz/raycast-media-flow
**Package manager:** npm

> v1 of this spec targeted a fictional "Raycast v2 API" and several macOS APIs that no longer
> work (MediaRemote direct linking, MPMediaQuery) or never existed (Slider, Form-Drafts-as-
> preferences, MenuBarExtra popovers with custom layout). This v2 was verified against
> developers.raycast.com and current macOS (15.4+/26) behavior. Every capability below is
> confirmed buildable.

---

## Verified platform constraints (do not re-litigate)

* `@raycast/api` is **1.x** (target `^1.104.0`). "Raycast 2.0" is an app rewrite, not an API bump.
* `menu-bar` commands: background refresh `interval` minimum is **10s** (docs elsewhere say 1m; `ray build` accepts `"10s"`, and `nowPlaying` ships with it to cut background staleness). 1–2s background refresh is impossible.
* While the menu is **open**, the command process stays alive — a `setInterval` + `setState` loop can live-update items (progress, position). It stops when the menu closes.
* `MenuBarExtra` renders a **native NSMenu**. Only `MenuBarExtra.Item` (title, subtitle, icon, tooltip, onAction, shortcut, alternate), `.Submenu`, `.Section`, and `Separator` exist. No custom row layout, no progress bars, no inline buttons, no arbitrary artwork sizes, no multi-line rows.
* **No Slider component** exists. Progress/volume shown via `getProgressIcon(progress)` (`@raycast/utils`) — a static circular pie icon — and discrete menu items.
* Extension **preferences are read-only** at runtime (`getPreferenceValues()`); declared in `package.json`. Form Drafts only preserve unsubmitted form input. Runtime-mutable state (pinned source, chosen fallback artwork) lives in `LocalStorage`.
* AI tools: `tools` array in `package.json`, one file per tool at `src/tools/<name>.ts`, optional `confirmation` export.
* No Touch Bar, VoiceOver-label, or high-contrast APIs are exposed to extension authors. Dropped.
* **Per-app muting is impossible** without a virtual audio driver. Dropped.
* `MPMediaQuery` is iOS-only. Dropped.
* Direct MediaRemote linking (`MRMediaRemoteGetNowPlayingInfo`) is entitlement-gated since macOS 15.4. The working path is the **`media-control` CLI** (ungive/mediaremote-adapter, Perl `com.apple.perl5` trust-model bypass) — maintained through macOS 26, no SIP disable. It can be closed by Apple in any point release, so the architecture must degrade gracefully to AppleScript-only mode.

---

## Detection engine (decided)

**Primary:** `media-control get` (JSON: title, artist, album, duration, elapsed, playing, bundle id, base64 `artworkData`) spawned via `execFile`. Covers *any* app registered with the system Now Playing service: Music, Spotify, TIDAL, Deezer, Amazon Music, browsers, VLC, podcast apps.

**Enrichment + fallback (AppleScript):**
* **Music.app** — full dictionary: `player state`, `current track` (name/artist/album/duration/position), `artwork 1` raw bytes. Also play/pause/next/prev control.
* **Spotify** — `player state`, `current track` (incl. `artwork url`, `spotify url`), play/pause/next/prev. Historically flaky; never sole source.
* **Safari / Chrome** — active tab title + URL only (YouTube heuristic: strip `" - YouTube"`). No position/artwork.
* **VLC** — transport control only (no reliable metadata via AppleScript).
* **Firefox, TIDAL, Deezer, Amazon Music** — no AppleScript dictionary. Covered by media-control only.

**Degraded mode:** if `media-control` is missing or errors, sources drop to AppleScript-covered apps and the menu shows an install hint (`brew install media-control`).

---

## Audio devices (all confirmed working)

* List/switch output & input: `macos-audio-devices` npm binding (or `SwitchAudioSource` CLI fallback). `transportType` distinguishes Bluetooth vs USB/built-in → wireless badge.
* System volume: `osascript -e "output volume of (get volume settings)"` / `set volume output volume N`.
* Per-device volume where the device supports it.
* ~~Per-app mute~~ — impossible, dropped.

---

## Commands

### 1. `menu-bar` command — `nowPlaying` (mode: menu-bar, interval: 10s)

Menu bar icon + title:
* Icon: artwork thumbnail when playing (Image.ImageLike from cached artwork file), else waveform icon.
* Title (optional, preference): `Title – Artist`, truncated ~30 chars.
* Tooltip: `Title — Artist — App`.
* Visibility preference: Always / Only when playing / Icon only.

Menu structure (native NSMenu):
```
[Section: Now Playing]                      ← one per active source, playing first, pinned first
  ♫ Title — Artist            (icon: artwork; subtitle: App • 1:23/3:45 ◔)  → onAction: open app
  ▶/⏸ Play/Pause             (⌘P)
  ⏭ Next  /  ⏮ Previous      (alternate item)
  Overflow ▸ (Submenu): Open in App, Copy "Title — Artist", Copy URL, Pin/Unpin
[Section: Audio]
  Output ▸ (Submenu): ✓ AirPods Pro ⌁ · MacBook Speakers · … (onAction: switch)
  Volume ▸ (Submenu): ◔ 75% · Mute · 25% · 50% · 75% · 100% · Louder ⌘↑ · Quieter ⌘↓
[Section]
  Details… (opens view command) · Hide/Show Title in Menu Bar · Open Extension Preferences · Refresh · Last update 12:03:44
```
* Progress rendered as `getProgressIcon(position/duration)` in the source item's icon slot or a dedicated item; text `1:23 / 3:45` in subtitle.
* While menu open: 10s `setInterval` re-poll updates position/state live (kept long enough to
  shrink the native-menu-rebuild window that could otherwise land a click on a shifted row).
  The interval is skipped entirely for background-refresh launches (`LaunchType.Background`) so
  it can't keep the process alive across the 10s command `interval`. Row order across re-polls
  is stabilized via `stabilizeOrder()` (`src/core/mediaService.ts`), which preserves the
  previous poll's relative ordering for known source ids and appends new ones — so a
  `isPlaying` flip can't reshuffle Play/Pause vs. Next/Previous mid-open.
* If nothing playing: placeholder item + quick-launch items for Music/Spotify.

### 2. `view` command — `mediaDetails` (mode: view)

The rich UI lives here (this replaces v1's impossible custom popover):
* `List` of sources (left) with `List.Item.Detail`: large artwork (markdown image), metadata panel (title, artist, album, app, duration, position, device), progress text.
* Actions: play/pause, next/prev, open in app, copy, pin, switch audio device (submenu action).
* Auto-refresh every 2s via `usePromise` + interval revalidation.

### 3. `view` command — `searchDevices` (mode: view)

* List input+output devices, active check-mark, wireless badge, transport type tag, per-device volume where supported, switch on enter.

### 4. `no-view` commands — dedicated playback shortcuts

* `nextTrack` — "Next Track": skip the top (playing-first) media source.
* `previousTrack` — "Previous Track": go back on the top media source.
* `togglePlayPause` — "Play/Pause": toggle play/pause on the top media source.

Each targets `getMediaSources().sources[0]`, shows a HUD confirming the action (or "No active
media source" when nothing is playing), and is meant to be bound to a global hotkey — no menu
navigation required.

### 5. AI tools (`tools` in package.json)

* `get-now-playing` — returns current track(s) JSON for Quick AI / AI chat.
* `control-playback` — play/pause/next/prev with `confirmation` export.

---

## Preferences (package.json, read-only at runtime)

* `menuBarStyle`: dropdown — `iconAndTitle` / `iconOnly` (default `iconAndTitle`)
* `showWhenStopped`: checkbox — keep icon when nothing plays (default true)
* `maxTitleLength`: textfield number (default 30)
* `refreshInterval`: command-level `interval` (default `1m`)

(No `primarySource` preference: source priority is covered by pinning + the
playing-first sort in `getMediaSources()`, so a manual "preferred engine" toggle was
intentionally dropped.)

Runtime-mutable state in `LocalStorage`: pinned source id, last known artwork cache index,
menu bar title hidden override (session-level toggle layered on top of the read-only
`menuBarStyle` preference; clearing it falls back to the preference).

---

## Architecture

```
src/
  nowPlaying.tsx            # menu-bar command
  mediaDetails.tsx          # view command (rich UI)
  searchDevices.tsx         # view command (audio devices)
  nextTrack.tsx             # no-view command (skip forward on top source)
  previousTrack.tsx         # no-view command (skip back on top source)
  togglePlayPause.tsx       # no-view command (toggle play/pause on top source)
  tools/
    get-now-playing.ts
    control-playback.ts
  core/
    types.ts                # MediaSource, AudioDevice, PlaybackCommand, SourceProvider
    registry.ts             # provider registry (ordered, capability-aware)
    mediaService.ts         # orchestrator: media-control + providers → MediaSource[]
    artworkCache.ts         # base64 → ~/Library/Caches file, TTL 1h, LRU
  providers/
    mediaControl.ts         # media-control CLI adapter (primary)
    music.ts                # Music.app AppleScript (enrich + control + raw artwork)
    spotify.ts              # Spotify AppleScript (enrich + control + artwork url)
    browser.ts              # Safari/Chrome tab-title heuristics
  audio/
    devices.ts              # macos-audio-devices wrapper + SwitchAudioSource fallback
    volume.ts               # osascript volume get/set
  lib/
    applescript.ts          # runAppleScript helper w/ timeout + retry
    exec.ts                 # execFile promisified w/ timeout
    format.ts               # mm:ss, truncation
tests/                      # vitest unit tests for core/, providers/ (mocked exec), lib/
docs/                       # CONTRIBUTING, ADDING_NEW_SOURCE, ARCHITECTURE, AI_TOOLS
.github/workflows/          # test.yml, lint.yml (+ existing pr-title, bump-version)
```

**Provider contract** (plugin architecture, unchanged in spirit from v1):

```typescript
interface SourceProvider {
  id: string;                    // "music", "spotify", "browser-chrome"
  displayName: string;
  /** Bundle ids this provider can enrich/control (matched against media-control output) */
  bundleIds: string[];
  isAvailable(): Promise<boolean>;
  getSource(): Promise<MediaSource | null>;
  capabilities: { control: boolean; artwork: boolean; seek: boolean };
  control?(cmd: PlaybackCommand): Promise<void>;
}
```

New sources = new file in `providers/` + one `registry.register()` line.

## Data model

```typescript
type PlaybackCommand = "play" | "pause" | "playpause" | "next" | "previous";

interface MediaSource {
  id: string;                  // bundle id or provider id
  appName: string;
  bundleId?: string;
  title: string;
  artist?: string;
  album?: string;
  artworkPath?: string;        // local cached file path (never remote at render time)
  duration?: number;           // seconds
  position?: number;           // seconds
  isPlaying: boolean;
  origin: "media-remote" | "applescript" | "browser";
  url?: string;                // web/track url when known
}

interface AudioDevice {
  id: string;
  name: string;
  kind: "input" | "output";
  transportType: string;       // "bluetooth", "usb", "builtin", …
  isWireless: boolean;
  isDefault: boolean;
  volume?: number;             // 0–1 when supported
}
```

## Quality bar

* TypeScript strict; ESLint via `@raycast/eslint-config`; vitest for unit tests (exec/osascript mocked).
* All spawned CLIs wrapped with timeout (1.5s) + one retry; failures degrade the single source, never the whole menu.
* Artwork cache: memory map + disk (`environment.supportPath`), TTL 1h.
* MIT license. CI: lint + typecheck + test on PR; semantic-release on main (already configured).
