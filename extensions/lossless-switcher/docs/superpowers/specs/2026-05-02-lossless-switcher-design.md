# lossless-switcher — Raycast Extension Design

**Date:** 2026-05-02
**Status:** Approved — ready for implementation planning
**Origin:** Port of [`alfred-apple-music-format`](https://github.com/ariestwn/alfred-apple-music-format) from Alfred workflow + SwiftUI menubar app to Raycast extension.

## Goal

Bit-perfect Apple Music playback on macOS via a Raycast extension. Detect the live audio format Music.app is decoding, and (optionally) auto-switch the default output device's CoreAudio physical format to match — bypassing macOS's default behavior of silently downsampling hi-res streams to whatever rate the DAC happens to be configured for.

The extension replaces both the Alfred workflow and the SwiftUI menubar app. Primary access is the Raycast command palette; a Raycast `menu-bar` command provides at-a-glance status.

## Scope

### Included

- Display currently-playing Apple Music track with live codec / sample rate / bit depth
- List & manually switch DAC sample rate / bit depth via CoreAudio HAL
- Auto-follow toggle: daemon switches DAC on every track change
- Now-playing detail with artwork, title, artist, album, format
- Copy format summary to clipboard (e.g. "Lossless 96 kHz / 24-bit")
- Menubar item with live sample-rate text
- Daemon start/stop control (power-user feature, hidden in Action Panel)
- Explicit `Uninstall Daemon` command for clean removal

### Excluded

- Transport controls (play/pause/next/prev/shuffle/repeat) — Music.app's media keys + Control Center widget cover this; dropping them avoids the Accessibility / System Events TCC complexity that plagued the Alfred version.
- Apply log viewer (`nplog` in Alfred) — debug-only, rarely consulted.

## Architecture

Two processes, three artifacts:

```
┌────────────────────────────────────┐         ┌──────────────────────────┐
│ Raycast Extension (TypeScript)     │         │ Headless Daemon (Swift)  │
│ ─ 5 commands                       │ ──────► │ ─ Tails MediaToolbox log │
│ ─ reads nowplaying.json            │ reads   │ ─ Writes nowplaying.json │
│ ─ calls audio_format CLI (sync)    │ ◄────── │ ─ Auto-applies via HAL   │
│ ─ fetches artwork from iTunes API  │ spawns  │ ─ KeepAlive LaunchAgent  │
│ ─ installs/manages LaunchAgent     │         └──────────────────────────┘
└────────────────────────────────────┘                      │
            │                                                ▼
            ▼                                        ┌────────────────┐
   ┌──────────────────┐                              │ CoreAudio HAL  │
   │ Raycast UI       │                              │ (sample rate)  │
   │ (List/Detail)    │                              └────────────────┘
   └──────────────────┘
```

**Bundle ID:** `com.ariestwn.lossless-switcher`. Distinct from the Alfred workflow's `com.ariestwn.apple-music-audio-format` so both can be temporarily side-by-side during user migration. Extension detects an installed Alfred LaunchAgent and warns the user to uninstall it (running both would cause double format-applies).

### Components

#### 1. Headless Daemon — `assets/lossless-watcher`

Single Mach-O Swift binary. Extracted from `app.swift` of the Alfred project, stripped of all UI (NSStatusItem, NSPanel, SwiftUI, AppleScript metadata fetch, iTunes artwork fetch, transport controls). Pure event loop.

Responsibilities:
- **`LogStreamer`** — spawns `/usr/bin/log stream --predicate '...MediaToolbox...'` filtered to Music.app, parses `[FormatID/SampleRate/BitDepth/Rendition]` lines from `FigStreamPlayer` log entries.
- **`NowPlayingWriter`** — atomic write of parsed format to `nowplaying.json` (write-temp + rename).
- **`AutoApplier`** — on track change, calls `kAudioStreamPropertyPhysicalFormat` to set default output device. Bit-depth fallback chain: requested → 24 → 32 → 16. DAC's native rate ladder is the ceiling.
- **`AppLog`** — append apply outcome to `apply.log` (kept for diagnostics; no UI consumes it in this version).
- **`FlagWatcher`** — `DispatchSource` on the support folder; toggles for `autoapply.off` reflect immediately without daemon restart.

No SwiftUI, no AppKit. `LSUIElement` not needed (binary, not `.app`). Universal binary (arm64 + x86_64).

#### 2. Audio Format CLI — `assets/audio_format`

Reused as-is from Alfred project's `audio_format.swift`. Three subcommands:

| Cmd | Purpose | Output |
|---|---|---|
| `list` | Available formats on default output device | JSON (Alfred-script-filter format, but extension parses `items[]`) |
| `set <rate> <bits> <int\|float>` | Apply format | Plain text confirmation or non-zero exit |
| `current` | Read current format | Plain text "DAC name: 24-bit Integer · 96 kHz" |

Universal binary.

#### 3. Raycast Extension — `src/`

```
src/
├── now-playing.tsx              # view: artwork + track + format + actions
├── switch-format.tsx            # view: List<Format>, search-able
├── toggle-auto-follow.ts        # no-view: toggle + showHUD
├── menu-bar.tsx                 # menu-bar: live rate
├── uninstall-daemon.ts          # no-view: full cleanup
└── lib/
    ├── daemon.ts                # install/uninstall/start/stop LaunchAgent + status
    ├── nowplaying.ts            # parse nowplaying.json + AppleScript fallback
    ├── audio-format.ts          # spawn audio_format CLI, parse output
    ├── artwork.ts               # iTunes Search API + cache to support folder
    ├── flags.ts                 # support folder flag toggles
    ├── applescript.ts           # safe osascript wrapper for Music.app metadata
    └── paths.ts                 # all cache/support paths constants
```

## Commands

### `Now Playing` (view)

Hub command. Shows current track + format + daemon status + all actions.

**Render path:**
1. On mount, run in parallel:
   - `applescript.musicState()` — returns `{state, name, artist, album, kind, class, sampleRate, bitRate}`.
   - `nowplaying.read()` — parses `nowplaying.json` (streaming track format).
   - `daemon.status()` — `launchctl print` parsing.
2. Choose source: if `class of t` is `file track` → trust AppleScript metadata; else → trust daemon's `nowplaying.json`. Mirrors Alfred `show.sh` logic.
3. Async: `artwork.fetch(artist, title)` → iTunes Search → 200×200 JPEG cached at `~/Library/Caches/com.ariestwn.lossless-switcher/artwork/<sha256(artist|title)>.jpg`.
4. Render `<Detail>` with markdown:
   ```
   ![](file://<artwork-path>)

   **<title>** — <artist>
   *<album>*

   <format>     ← e.g. "96 kHz · 24-bit · Hi-Res Lossless (ALAC)"

   ─────
   Daemon: <status>     ← e.g. "Running · auto-follow on"
   ```
5. Re-poll every 2s via `useInterval` while view is active (Music.app track changes mid-view).

**Action Panel:**

| Action | Shortcut | Effect |
|---|---|---|
| Switch Audio Format | ⏎ | Push `switch-format.tsx` |
| Toggle Auto-Follow | ⌘T | Same logic as standalone command |
| Copy Format Summary | ⌘C | One-line summary to clipboard |
| Start Daemon | ⌘⇧S | Visible only when daemon stopped |
| Stop Daemon | ⌘⇧X | Visible only when daemon running |
| Uninstall Daemon | — | Push `uninstall-daemon` (with confirmation) |

**Empty states:**
- Music.app not running → "Open Apple Music to start"
- Daemon not yet installed → "Setting up daemon…" toast → calls `daemon.ensureInstalled()`
- Daemon installed but format not yet captured → "Format not captured yet — skip to next track" (matches Alfred fallback message)

### `Switch Audio Format` (view)

Direct format picker. Spawns `audio_format list` on mount, renders `<List>` with a "Current" section (single item) and "Available" section.

Item title format: `24-bit Integer · 96 kHz`. Subtitle: `Set <DAC name>`. Default action: `Set` → spawns `audio_format set <rate> <bits> <int|float>` → `showHUD("→ 96 kHz / 24-bit Integer")` on success or `showToast(Failure, message)` on error.

### `Toggle Auto-Follow` (no-view)

Command runs without view. Logic:
1. Read flag file `~/Library/Application Support/com.ariestwn.lossless-switcher/autoapply.off`.
2. Toggle: if exists → `rm`, else → `touch`.
3. Daemon's `DispatchSource` fires within ~10ms; behavior changes immediately.
4. `showHUD("Auto-follow ON")` or `showHUD("Auto-follow OFF")`.

### `Lossless Status` (menu-bar)

Raycast `menu-bar` command. Polls every 2s:
1. `nowplaying.read()` → format from streaming, OR `audio_format current` → device's actual configured format.
2. Title rendering:
   - Music playing → live source rate, e.g. `96 kHz`.
   - Music idle → device's configured rate, dimmed.
   - Daemon stopped → small dot icon (visual indicator of offline).
3. Click → opens `now-playing` command via Raycast deeplink (`raycast://extensions/<authorslug>/lossless-switcher/now-playing`).

### `Uninstall Daemon` (no-view)

Explicit cleanup command. Required because Raycast doesn't fire any hook when an extension is uninstalled — without this, removing the extension would leave the LaunchAgent running indefinitely.

Flow:
1. `confirmAlert({ title: "Uninstall daemon?", message: "This stops the background watcher, removes the LaunchAgent, and deletes cached data. The Raycast extension will stop functioning until reinstalled.", primaryAction: { title: "Uninstall", style: Alert.ActionStyle.Destructive } })`. Cancel → exit silently.
2. Sequential cleanup (continue on error, collect failures):
   - `launchctl bootout gui/$UID/com.ariestwn.lossless-switcher` (bootout before plist removal — bootout-while-plist-exists is the supported teardown order)
   - `rm -f ~/Library/LaunchAgents/com.ariestwn.lossless-switcher.plist`
   - `rm -rf ~/Library/Application\ Support/com.ariestwn.lossless-switcher/`
   - `rm -rf ~/Library/Caches/com.ariestwn.lossless-switcher/`
3. On success: `showHUD("Daemon uninstalled — you can now remove the extension from Raycast")`.
4. On partial failure: `showToast(Failure, "<list of paths that couldn't be removed>")` — user can clean up manually.

README documents the order: **run `Uninstall Daemon` first, then remove the extension from Raycast**.

## Daemon Lifecycle

### Install (first-run)

`now-playing.tsx` mount triggers `daemon.ensureInstalled()`:
1. Idempotent. Check `launchctl print gui/$UID/com.ariestwn.lossless-switcher` exit code.
2. If not installed:
   - Copy `assets/lossless-watcher` → `~/Library/Application Support/com.ariestwn.lossless-switcher/lossless-watcher`. `chmod +x`.
   - Copy `assets/audio_format` → same support folder. `chmod +x`.
   - Generate `com.ariestwn.lossless-switcher.plist` from a template (substituting absolute path of the watcher binary), write to `~/Library/LaunchAgents/`.
   - `launchctl bootstrap gui/$UID <plist>`.
3. Show toast `Setting up Lossless Switcher…` during steps; success → toast clears; failure → persistent error toast with remediation.

Idempotency matters: `Now Playing` runs `ensureInstalled()` every mount. After first install, it's a single `launchctl print` call (~5ms).

### Start / Stop

Action Panel actions in `now-playing.tsx`:
- **Stop** → `launchctl bootout`, then `touch daemon.off` flag (mirrors Alfred behavior — flag prevents auto-heal from undoing the stop).
- **Start** → `rm daemon.off`, then `launchctl bootstrap`.

Daemon status pill in Now Playing reflects current state.

### LaunchAgent plist

Minimal plist:

```xml
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ariestwn.lossless-switcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/<user>/Library/Application Support/com.ariestwn.lossless-switcher/lossless-watcher</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key>
    <string>/Users/<user>/Library/Caches/com.ariestwn.lossless-switcher/watcher.out</string>
    <key>StandardErrorPath</key>
    <string>/Users/<user>/Library/Caches/com.ariestwn.lossless-switcher/watcher.err</string>
</dict>
</plist>
```

The `<user>` substitution uses `$HOME` resolved at install time (sandboxed launchd doesn't expand env vars in the plist).

## Data Flow Summary

```
Music.app
   │
   ▼ MediaToolbox → unified log
[lossless-watcher] tails log, parses format
   │
   ├── writes ──► nowplaying.json (consumed by extension)
   ├── writes ──► apply.log (diagnostic)
   └── calls ──► CoreAudio HAL (when autoapply.off absent)

Raycast Extension
   │
   ├── reads ─────► nowplaying.json (streaming track format)
   ├── osascript ──► Music.app (local file metadata + playback state)
   ├── spawns ────► audio_format CLI (manual switch + current state)
   ├── fetches ───► iTunes Search API (artwork)
   └── manages ───► LaunchAgent (install/start/stop/uninstall)
```

## Paths

```
~/Library/Caches/com.ariestwn.lossless-switcher/
  ├── nowplaying.json        # daemon writes per track-start, extension reads
  ├── apply.log              # daemon append per successful auto-apply
  ├── artwork/<hash>.jpg     # extension writes (iTunes Search results, 200×200)
  ├── watcher.out            # LaunchAgent stdout
  └── watcher.err            # LaunchAgent stderr

~/Library/Application Support/com.ariestwn.lossless-switcher/
  ├── lossless-watcher       # daemon binary (chmod 755)
  ├── audio_format           # CLI binary (chmod 755)
  ├── autoapply.off          # presence disables auto-follow (watched by daemon)
  └── daemon.off             # presence prevents auto-restart by Now Playing

~/Library/LaunchAgents/com.ariestwn.lossless-switcher.plist
```

Cache file format (`nowplaying.json`):

```json
{
  "timestamp": 1714650000.123,
  "format": "alac",
  "sampleRate": 96000,
  "bitDepth": 24,
  "channels": 2,
  "rendition": "Hi-Res Lossless"
}
```

Same shape as Alfred to keep parsing identical.

## Permissions

Only one needed:

- **Automation → Music** — auto-prompted on first AppleScript call by Raycast (the prompt is attributed to Raycast.app, not the daemon). User clicks Allow.

That's it. Because we dropped transport controls, **Automation → System Events** and **Accessibility** are not required, eliminating the most fragile TCC concerns from the Alfred version.

The daemon itself doesn't need TCC permissions — it only reads `/usr/bin/log stream` (no entitlement required), writes to user cache, and calls CoreAudio HAL (no entitlement required).

## Error Handling

| Scenario | Behavior |
|---|---|
| Music.app not running | Now Playing → empty state "Open Apple Music to start" |
| Daemon not installed (first run) | Auto-install with loading toast; on failure, persistent error toast |
| Daemon stopped manually | Show "Daemon stopped" pill in Now Playing + Start Daemon action |
| `audio_format set` fails (DAC exclusive mode, format unsupported) | `showToast(Failure, error.message)` |
| `nowplaying.json` missing/corrupt | Fall back to AppleScript metadata; if also fails → empty state |
| Streaming format not yet captured (Apple Music just started) | "Format not captured yet — skip to next track" |
| iTunes Search API timeout | Render Now Playing without artwork; no error toast (artwork is best-effort) |
| Old Alfred daemon detected (`com.ariestwn.apple-music-audio-format`) | Warning banner in Now Playing with link to migration instructions |

All errors logged to Raycast's environment log (no separate diagnostic file).

## Build & Distribution

### Repository layout

```
lossless-switcher/
├── package.json
├── README.md
├── src/                    # TypeScript Raycast extension (commands + src/lib/)
├── swift-src/              # Swift source for daemon + CLI
│   ├── lossless-watcher.swift
│   ├── audio_format.swift
│   └── build.sh            # produces universal binaries
├── assets/                 # binaries gitignored, plist.template + icon checked in
│   ├── lossless-watcher    # built by swift-src/build.sh
│   ├── audio_format        # built by swift-src/build.sh
│   ├── plist.template      # checked in
│   └── extension-icon.png  # checked in
└── docs/superpowers/specs/
```

Internal structure of `src/` matches the layout in Components section above (commands at top level, helpers in `src/lib/`).

### Build pipeline

`package.json`:

```json
{
  "scripts": {
    "build-binaries": "./swift-src/build.sh",
    "build": "npm run build-binaries && ray build",
    "dev": "ray develop",
    "publish": "npm run build && ray publish"
  }
}
```

`swift-src/build.sh`:
1. `swiftc -O -target arm64-apple-macos13 -o build/arm64/lossless-watcher swift-src/lossless-watcher.swift`
2. `swiftc -O -target x86_64-apple-macos13 -o build/x86_64/lossless-watcher swift-src/lossless-watcher.swift`
3. `lipo -create build/arm64/lossless-watcher build/x86_64/lossless-watcher -output assets/lossless-watcher`
4. Same for `audio_format`.
5. Ad-hoc codesign: `codesign --sign - --force assets/lossless-watcher assets/audio_format`.

Estimated total binary size: ~2-3 MB across both binaries.

### Asset bundling

Raycast bundles `assets/` into the extension package automatically. On install (in dev or from Store), assets land in the extension's installed path (read-only). Extension copies them to `~/Library/Application Support/com.ariestwn.lossless-switcher/` on first run because LaunchAgent needs a stable, writable path that survives extension upgrades.

### Distribution risks

- **Bundle binary in Raycast Store extension** — 2-3 MB binary is unusual for the Store. No documented hard limit, but worth verifying with Raycast's review process. **Fallback:** download binaries from a GitHub Release on first run if Store rejects bundled binaries.
- **Ad-hoc codesigning** — `codesign --sign -`. macOS will prompt the user the first time the daemon runs ("downloaded from internet" / Gatekeeper). One-time, but may confuse users. Mitigate with README step.

## Migration from Alfred Workflow

Users with the Alfred workflow installed need to remove it before installing the Raycast extension; otherwise both daemons would compete for the format-apply path.

Detection (in `now-playing.tsx` mount):
```
launchctl print gui/$UID/com.ariestwn.apple-music-audio-format
```

If exit 0, render a banner above Now Playing:

> **Old Alfred workflow detected.** Remove the Apple Music + Audio Format Alfred workflow first, then run `tccutil reset Automation com.ariestwn.apple-music-audio-format` and reinstall this extension.

Banner has a "Run Cleanup" action that runs `launchctl bootout` + removes the old plist + old support folder. The Alfred workflow itself remains in Alfred (user removes it from Alfred UI).

## Risks & Trade-offs

| Risk | Mitigation |
|---|---|
| Raycast Store rejects bundled Swift binaries | Fallback to GitHub Release download on first run |
| User uninstalls extension without running `Uninstall Daemon` | Daemon LaunchAgent keeps running. README documents the order; future Raycast versions may add uninstall hooks. |
| 2s polling in `menu-bar` command | Negligible: file read + ~5ms `audio_format current` spawn. Profile in implementation; raise interval if needed. |
| Drop transport controls | Music.app has media keys + Control Center widget. Not a regression for hi-fi listening flow. |
| Ad-hoc codesigning Gatekeeper warning | One-time, documented in README |
| Apple changes log format / MediaToolbox subsystem (next macOS) | Daemon parser is regex-based and brittle. Same risk Alfred version had. Acceptable. |

## Out of Scope (Future Considerations)

- DAC selection UI (currently uses default output device only).
- Per-track format override (e.g., always 192 kHz for classical playlists).
- Spotify / other streaming app support (would require separate log parsers).
- Lossless format download / library track quality auditing.

## Open Questions

None — all design decisions resolved during brainstorming. Implementation can proceed.
