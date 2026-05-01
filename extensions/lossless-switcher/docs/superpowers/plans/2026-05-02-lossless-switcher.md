# lossless-switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Raycast extension that detects Apple Music's live audio format and (optionally) auto-switches the macOS default output device's CoreAudio physical format to match — replacing the existing Alfred workflow + SwiftUI menubar app.

**Architecture:** TypeScript Raycast extension front-end (5 commands) drives a headless Swift daemon installed as a LaunchAgent. The daemon tails `/usr/bin/log stream` for MediaToolbox format reports, writes a JSON cache, and applies CoreAudio HAL physical-format changes. A second Swift binary (`audio_format`) provides synchronous CoreAudio queries for the extension. Bundle ID `com.ariestwn.lossless-switcher`.

**Tech Stack:** TypeScript / React (Raycast `@raycast/api`), Swift 5.7+ (CoreAudio HAL, Foundation), Jest for unit tests, `launchctl` for service management.

**Reference spec:** `docs/superpowers/specs/2026-05-02-lossless-switcher-design.md`

**Reference source (read-only):** `/Users/ariestwn/Developer/projects/alfred/` — existing Alfred + SwiftUI implementation. We extract the daemon logic and reuse the `audio_format` CLI verbatim.

---

## File Structure

```
lossless-switcher/
├── package.json                       # Raycast extension manifest
├── tsconfig.json
├── jest.config.js
├── .gitignore
├── .eslintrc.json
├── README.md
├── src/
│   ├── now-playing.tsx                # view command
│   ├── switch-format.tsx              # view command
│   ├── toggle-auto-follow.ts          # no-view command
│   ├── menu-bar.tsx                   # menu-bar command
│   ├── uninstall-daemon.tsx           # view (with confirm) command
│   └── lib/
│       ├── paths.ts                   # constants for cache + support paths
│       ├── flags.ts                   # autoapply.off / daemon.off toggles
│       ├── audio-format.ts            # spawn audio_format CLI + parse output
│       ├── nowplaying.ts              # parse nowplaying.json
│       ├── applescript.ts             # Music.app metadata via osascript
│       ├── daemon.ts                  # LaunchAgent install/start/stop/uninstall
│       ├── artwork.ts                 # iTunes Search API + cache
│       ├── format-display.ts          # human-readable format strings
│       └── __tests__/                 # Jest tests for pure-logic modules
├── swift-src/
│   ├── lossless-watcher.swift         # daemon source
│   ├── audio_format.swift             # CLI source (copied from Alfred verbatim)
│   └── build.sh                       # produces universal binaries to assets/
├── assets/
│   ├── lossless-watcher               # gitignored — built binary (universal)
│   ├── audio_format                   # gitignored — built binary (universal)
│   ├── plist.template                 # checked in — LaunchAgent plist template
│   └── extension-icon.png             # checked in — Raycast extension icon
└── docs/superpowers/
    ├── specs/2026-05-02-lossless-switcher-design.md
    └── plans/2026-05-02-lossless-switcher.md          # this file
```

**File responsibilities:**
- `src/lib/*.ts` — pure logic, testable. No `@raycast/api` imports.
- `src/*.tsx` — Raycast command entry points. Compose from `src/lib/`.
- `swift-src/*.swift` — Swift sources. Built into universal binaries by `build.sh`.
- `assets/` — bundled with the extension on publish.

---

## Phase 1 — Project Scaffolding

### Task 1: Initialize Raycast extension package

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.eslintrc.json`

- [ ] **Step 1: Create `package.json` with full Raycast manifest**

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "lossless-switcher",
  "title": "Lossless Switcher",
  "description": "Bit-perfect Apple Music — detects the live audio format and auto-switches your DAC sample rate.",
  "icon": "extension-icon.png",
  "author": "ariestwn",
  "categories": ["Media", "System"],
  "license": "MIT",
  "commands": [
    {
      "name": "now-playing",
      "title": "Now Playing",
      "subtitle": "Apple Music",
      "description": "Show the currently-playing track + live audio format",
      "mode": "view"
    },
    {
      "name": "switch-format",
      "title": "Switch Audio Format",
      "subtitle": "Apple Music",
      "description": "Change the default output device sample rate / bit depth",
      "mode": "view"
    },
    {
      "name": "toggle-auto-follow",
      "title": "Toggle Auto-Follow",
      "subtitle": "Apple Music",
      "description": "Toggle auto-switching the DAC format on every track change",
      "mode": "no-view"
    },
    {
      "name": "menu-bar",
      "title": "Lossless Status",
      "subtitle": "Apple Music",
      "description": "Live sample rate in the menu bar",
      "mode": "menu-bar",
      "interval": "1m"
    },
    {
      "name": "uninstall-daemon",
      "title": "Uninstall Daemon",
      "subtitle": "Apple Music",
      "description": "Remove the LaunchAgent and clear cached data — run before removing the extension",
      "mode": "view"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.83.0",
    "@raycast/utils": "^1.17.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.11",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "prettier": "^3.2.5",
    "ts-jest": "^29.1.2",
    "typescript": "^5.4.0"
  },
  "scripts": {
    "build-binaries": "./swift-src/build.sh",
    "build": "npm run build-binaries && ray build",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint",
    "test": "jest",
    "publish": "npm run build && npx @raycast/api@latest publish"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "include": ["src/**/*", "raycast-env.d.ts"],
  "compilerOptions": {
    "lib": ["ES2023"],
    "module": "commonjs",
    "target": "ES2022",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "noEmit": true
  }
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.DS_Store
dist/
*.log
swift-src/build/
assets/lossless-watcher
assets/audio_format
.raycast/
coverage/
```

- [ ] **Step 4: Create `.eslintrc.json`**

```json
{
  "root": true,
  "extends": ["@raycast"]
}
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: completes without errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore .eslintrc.json package-lock.json
git commit -m "chore: scaffold Raycast extension"
```

---

### Task 2: Set up Jest test infrastructure

**Files:**
- Create: `jest.config.js`
- Create: `src/lib/__tests__/.gitkeep`

- [ ] **Step 1: Create `jest.config.js`**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/lib/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["src/lib/**/*.ts", "!src/lib/**/*.test.ts"],
  moduleNameMapper: {
    "^@raycast/(.*)$": "<rootDir>/src/test-stubs/raycast-$1.ts"
  }
};
```

- [ ] **Step 2: Create stub for `@raycast/api` (only used by tests for modules that import it)**

```bash
mkdir -p src/test-stubs
```

Create `src/test-stubs/raycast-api.ts`:

```ts
export const environment = {
  supportPath: "/tmp/test-support",
  assetsPath: "/tmp/test-assets"
};
export const showHUD = jest.fn();
export const showToast = jest.fn();
export const Toast = { Style: { Success: "success", Failure: "failure" } };
export const confirmAlert = jest.fn();
export const Alert = { ActionStyle: { Destructive: "destructive" } };
```

Create `src/test-stubs/raycast-utils.ts`:

```ts
export const useExec = jest.fn();
```

- [ ] **Step 3: Create the empty tests directory marker**

```bash
mkdir -p src/lib/__tests__
touch src/lib/__tests__/.gitkeep
```

- [ ] **Step 4: Verify Jest runs (no tests yet, expects "no tests found" or pass-through)**

Run: `npm test -- --passWithNoTests`
Expected: exit 0, "No tests found, exiting with code 0".

- [ ] **Step 5: Commit**

```bash
git add jest.config.js src/test-stubs src/lib/__tests__/.gitkeep
git commit -m "chore: add Jest test infrastructure"
```

---

## Phase 2 — Swift Binaries

### Task 3: Copy `audio_format.swift` from the Alfred project

**Files:**
- Create: `swift-src/audio_format.swift`

- [ ] **Step 1: Copy the file verbatim**

```bash
mkdir -p swift-src
cp /Users/ariestwn/Developer/projects/alfred/src/audio_format.swift swift-src/audio_format.swift
```

- [ ] **Step 2: Verify the copy is identical**

Run: `diff /Users/ariestwn/Developer/projects/alfred/src/audio_format.swift swift-src/audio_format.swift`
Expected: no output (files are identical).

- [ ] **Step 3: Commit**

```bash
git add swift-src/audio_format.swift
git commit -m "feat: import audio_format CLI from Alfred project"
```

---

### Task 4: Write `lossless-watcher.swift` (headless daemon)

**Files:**
- Create: `swift-src/lossless-watcher.swift`

This file is the daemon — extracted from `/Users/ariestwn/Developer/projects/alfred/src/app.swift` with all UI removed.

- [ ] **Step 1: Read reference sections from Alfred `app.swift`**

The needed sections (read these from `/Users/ariestwn/Developer/projects/alfred/src/app.swift`):
- Paths constants — lines 18-36 (rewrite with new bundle ID)
- CoreAudio helpers — lines 37-163 (copy verbatim, including `applyAudioFormat`)
- Log watcher — lines 241-348 (copy with one tweak: remove `onChange` callback — daemon has no observers)

Skip:
- Artwork fetch (165-203)
- AppleScript player bridge (350-501)
- Player store (503-583)
- SwiftUI card (585-767)
- App delegate / NSStatusItem (769-end)

- [ ] **Step 2: Write `swift-src/lossless-watcher.swift`**

```swift
// lossless-watcher
//
// Headless background daemon. Tails Music.app's MediaToolbox log stream,
// parses live audio format, writes to nowplaying.json, optionally
// auto-applies CoreAudio HAL physical format on track change.
//
// Lifecycle: launchd LaunchAgent (KeepAlive=true). No UI.

import CoreAudio
import Foundation

// MARK: - Paths -

let bundleID = "com.ariestwn.lossless-switcher"
let cacheDir =
    NSString(string: "~/Library/Caches/\(bundleID)").expandingTildeInPath
let supportDir =
    NSString(string: "~/Library/Application Support/\(bundleID)").expandingTildeInPath

let cachePath = "\(cacheDir)/nowplaying.json"
let applyLogPath = "\(cacheDir)/apply.log"
let offSwitchPath = "\(supportDir)/autoapply.off"

func ensureDirs() {
    let fm = FileManager.default
    try? fm.createDirectory(atPath: cacheDir, withIntermediateDirectories: true)
    try? fm.createDirectory(atPath: supportDir, withIntermediateDirectories: true)
}

// MARK: - CoreAudio helpers (verbatim from Alfred app.swift) -

let kMain = AudioObjectPropertyElement(kAudioObjectPropertyElementMain)
let kSystem = AudioObjectID(kAudioObjectSystemObject)

struct DeviceFormat: Hashable {
    let rate: Int
    let bits: UInt32
    let isFloat: Bool
}

func formatKey(_ f: AudioStreamBasicDescription) -> DeviceFormat {
    DeviceFormat(
        rate: Int(f.mSampleRate.rounded()),
        bits: f.mBitsPerChannel,
        isFloat: (f.mFormatFlags & kAudioFormatFlagIsFloat) != 0
    )
}

func defaultOutputDevice() -> AudioDeviceID? {
    var id: AudioDeviceID = 0
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kMain
    )
    return AudioObjectGetPropertyData(kSystem, &addr, 0, nil, &size, &id) == noErr && id != 0
        ? id : nil
}

func outputStreams(_ d: AudioDeviceID) -> [AudioStreamID] {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyStreams,
        mScope: kAudioDevicePropertyScopeOutput,
        mElement: kMain
    )
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(d, &addr, 0, nil, &size) == noErr else { return [] }
    var streams = [AudioStreamID](
        repeating: 0, count: Int(size) / MemoryLayout<AudioStreamID>.size
    )
    return AudioObjectGetPropertyData(d, &addr, 0, nil, &size, &streams) == noErr
        ? streams : []
}

func availableFormats(_ stream: AudioStreamID) -> [AudioStreamBasicDescription] {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioStreamPropertyAvailablePhysicalFormats,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kMain
    )
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(stream, &addr, 0, nil, &size) == noErr else { return [] }
    var ranges = [AudioStreamRangedDescription](
        repeating: AudioStreamRangedDescription(),
        count: Int(size) / MemoryLayout<AudioStreamRangedDescription>.size
    )
    guard AudioObjectGetPropertyData(stream, &addr, 0, nil, &size, &ranges) == noErr else { return [] }
    return ranges.map { $0.mFormat }
}

func setFormat(_ stream: AudioStreamID, _ fmt: AudioStreamBasicDescription) -> Bool {
    var f = fmt
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioStreamPropertyPhysicalFormat,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kMain
    )
    return AudioObjectSetPropertyData(
        stream, &addr, 0, nil,
        UInt32(MemoryLayout<AudioStreamBasicDescription>.size), &f
    ) == noErr
}

func applyAudioFormat(rate: Int, bits: UInt32) -> Bool {
    guard let device = defaultOutputDevice() else { return false }
    let streams = outputStreams(device)
    guard !streams.isEmpty else { return false }

    // Bit-depth fallback: requested → 24 → 32 → 16
    let depthOrder: [UInt32] = [bits, 24, 32, 16].reduce(into: []) { acc, x in
        if !acc.contains(x) { acc.append(x) }
    }

    for depth in depthOrder {
        for stream in streams {
            for fmt in availableFormats(stream) {
                let k = formatKey(fmt)
                if k.rate == rate, k.bits == depth, !k.isFloat {
                    var ok = true
                    for s in streams { ok = setFormat(s, fmt) && ok }
                    if ok { return true }
                }
            }
        }
    }
    return false
}

// MARK: - Log watcher -

final class LogWatcher {
    private var lastApplied = ""
    private var buffer = ""
    private var task: Process?

    private let formatPat = #/\[AudioFormat ([a-zA-Z0-9]+)/#
    private let rendPat = #/\[Rendition ([^\]]+)\]/#
    private let ratePat = #/\[SampleRate (\d+)\]/#
    private let bitsPat = #/\[BitDepth (\d+)\]/#
    private let chnPat = #/\[AudioChannels (\d+)\]/#

    private let dateFormatter: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd HH:mm:ss"; return f
    }()

    func start() {
        if task?.isRunning == true { return }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/log")
        p.arguments = [
            "stream", "--info", "--style", "compact",
            "--predicate", #"process == "Music" AND senderImagePath CONTAINS "MediaToolbox""#,
        ]
        let pipe = Pipe()
        p.standardOutput = pipe
        p.standardError = FileHandle.nullDevice
        pipe.fileHandleForReading.readabilityHandler = { [weak self] h in
            let data = h.availableData
            guard !data.isEmpty, let s = String(data: data, encoding: .utf8) else { return }
            self?.feed(s)
        }
        try? p.run()
        self.task = p
    }

    private func feed(_ chunk: String) {
        buffer.append(chunk)
        while let nl = buffer.firstIndex(of: "\n") {
            let line = String(buffer[..<nl])
            buffer.removeSubrange(buffer.startIndex...nl)
            handle(line)
        }
    }

    private func cap(_ line: String, _ pat: Regex<(Substring, Substring)>) -> String {
        (try? pat.firstMatch(in: line)).map { String($0.1) } ?? ""
    }

    private func handle(_ line: String) {
        guard line.contains("ReportAudioPlaybackThroughFigLog") else { return }

        let fmt = cap(line, formatPat)
        let rend = cap(line, rendPat)
        let rate = cap(line, ratePat)
        let bits = cap(line, bitsPat)
        let chn = cap(line, chnPat)
        let ts = Int(Date().timeIntervalSince1970)

        var payload: [String: Any] = [
            "timestamp": ts,
            "format": fmt,
            "rendition": rend,
            "source": "report",
        ]
        payload["sampleRate"] = Int(rate) ?? NSNull()
        payload["bitDepth"] = Int(bits) ?? NSNull()
        payload["channels"] = Int(chn) ?? NSNull()
        if let data = try? JSONSerialization.data(withJSONObject: payload) {
            try? data.write(to: URL(fileURLWithPath: cachePath), options: .atomic)
        }

        let key = "\(rate)-\(bits)"
        if key != lastApplied,
           !rate.isEmpty, !bits.isEmpty,
           !FileManager.default.fileExists(atPath: offSwitchPath),
           let r = Int(rate), let b = UInt32(bits)
        {
            if applyAudioFormat(rate: r, bits: b) {
                let entry = "\(dateFormatter.string(from: Date())) applied \(rate)/\(bits)-bit int\n"
                if let d = entry.data(using: .utf8) {
                    if let h = FileHandle(forWritingAtPath: applyLogPath) {
                        defer { try? h.close() }
                        _ = try? h.seekToEnd()
                        try? h.write(contentsOf: d)
                    } else {
                        try? d.write(to: URL(fileURLWithPath: applyLogPath))
                    }
                }
                lastApplied = key
            }
        }
    }
}

// MARK: - Main -

ensureDirs()
let watcher = LogWatcher()
watcher.start()
RunLoop.current.run()  // block forever; LaunchAgent KeepAlive handles crash recovery
```

- [ ] **Step 3: Smoke-test compile**

```bash
swiftc -O -target arm64-apple-macos13 -o /tmp/lossless-watcher-smoke swift-src/lossless-watcher.swift
ls -lh /tmp/lossless-watcher-smoke
```

Expected: binary produced, ~1 MB. No compile errors.

- [ ] **Step 4: Smoke-test run (will block — kill after a few seconds)**

```bash
/tmp/lossless-watcher-smoke &
WATCHER_PID=$!
sleep 3
kill $WATCHER_PID 2>/dev/null
ls -la "$HOME/Library/Caches/com.ariestwn.lossless-switcher/" 2>/dev/null || echo "cache dir not created (may not have triggered if Music wasn't playing)"
ls -la "$HOME/Library/Application Support/com.ariestwn.lossless-switcher/" 2>/dev/null
```

Expected: at minimum, the support and cache directories exist (created by `ensureDirs`).

Cleanup: `rm -rf "$HOME/Library/Caches/com.ariestwn.lossless-switcher/" "$HOME/Library/Application Support/com.ariestwn.lossless-switcher/" /tmp/lossless-watcher-smoke`

- [ ] **Step 5: Commit**

```bash
git add swift-src/lossless-watcher.swift
git commit -m "feat: add headless lossless-watcher daemon source"
```

---

### Task 5: Write `swift-src/build.sh` to produce universal binaries

**Files:**
- Create: `swift-src/build.sh`

- [ ] **Step 1: Write the build script**

```bash
#!/usr/bin/env bash
# Builds universal (arm64+x86_64) binaries from Swift sources into assets/.
# Idempotent. Used by `npm run build-binaries`.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
SRC="$ROOT/swift-src"
OUT="$ROOT/assets"
BUILD="$SRC/build"

mkdir -p "$OUT" "$BUILD/arm64" "$BUILD/x86_64"

build_one() {
    local name=$1
    echo "→ Building $name"
    swiftc -O -target arm64-apple-macos13   -o "$BUILD/arm64/$name"   "$SRC/$name.swift"
    swiftc -O -target x86_64-apple-macos13  -o "$BUILD/x86_64/$name"  "$SRC/$name.swift"
    lipo -create "$BUILD/arm64/$name" "$BUILD/x86_64/$name" -output "$OUT/$name"
    chmod +x "$OUT/$name"
    codesign --sign - --force --preserve-metadata=entitlements "$OUT/$name" 2>/dev/null || codesign --sign - --force "$OUT/$name"
    echo "  ✓ $OUT/$name ($(file -b "$OUT/$name"))"
}

build_one lossless-watcher
build_one audio_format

echo "Done."
```

- [ ] **Step 2: Make executable**

```bash
chmod +x swift-src/build.sh
```

- [ ] **Step 3: Run the build**

Run: `./swift-src/build.sh`
Expected:
```
→ Building lossless-watcher
  ✓ /Users/.../assets/lossless-watcher (Mach-O universal binary with 2 architectures: ...)
→ Building audio_format
  ✓ /Users/.../assets/audio_format (Mach-O universal binary with 2 architectures: ...)
Done.
```

- [ ] **Step 4: Verify universal binaries**

```bash
file assets/lossless-watcher assets/audio_format
ls -lh assets/lossless-watcher assets/audio_format
```

Expected: both report "Mach-O universal binary with 2 architectures", combined size ≤ 5 MB.

- [ ] **Step 5: Smoke-test `audio_format` CLI**

Run: `./assets/audio_format list | head -c 200`
Expected: JSON output starting with `{"items":[`.

Run: `./assets/audio_format current`
Expected: text like `Built-in Output: 24-bit Integer · 48 kHz`.

- [ ] **Step 6: Commit**

```bash
git add swift-src/build.sh
git commit -m "feat: add build script for universal Swift binaries"
```

---

## Phase 3 — TypeScript lib helpers

### Task 6: `src/lib/paths.ts` — path constants

**Files:**
- Create: `src/lib/paths.ts`

- [ ] **Step 1: Write the file**

```ts
import { homedir } from "os";
import path from "path";

export const BUNDLE_ID = "com.ariestwn.lossless-switcher";
export const OLD_ALFRED_BUNDLE_ID = "com.ariestwn.apple-music-audio-format";

const HOME = homedir();

export const SUPPORT_DIR = path.join(HOME, "Library", "Application Support", BUNDLE_ID);
export const CACHE_DIR = path.join(HOME, "Library", "Caches", BUNDLE_ID);
export const LAUNCH_AGENTS_DIR = path.join(HOME, "Library", "LaunchAgents");

export const NOWPLAYING_PATH = path.join(CACHE_DIR, "nowplaying.json");
export const APPLY_LOG_PATH = path.join(CACHE_DIR, "apply.log");
export const ARTWORK_DIR = path.join(CACHE_DIR, "artwork");

export const WATCHER_BIN = path.join(SUPPORT_DIR, "lossless-watcher");
export const AUDIO_FORMAT_BIN = path.join(SUPPORT_DIR, "audio_format");
export const PLIST_PATH = path.join(LAUNCH_AGENTS_DIR, `${BUNDLE_ID}.plist`);

export const AUTOAPPLY_OFF_FLAG = path.join(SUPPORT_DIR, "autoapply.off");
export const DAEMON_OFF_FLAG = path.join(SUPPORT_DIR, "daemon.off");

export const OLD_ALFRED_SUPPORT_DIR = path.join(
  HOME, "Library", "Application Support", OLD_ALFRED_BUNDLE_ID
);
export const OLD_ALFRED_CACHE_DIR = path.join(
  HOME, "Library", "Caches", OLD_ALFRED_BUNDLE_ID
);
export const OLD_ALFRED_PLIST_PATH = path.join(
  LAUNCH_AGENTS_DIR, `${OLD_ALFRED_BUNDLE_ID}.plist`
);
```

- [ ] **Step 2: Commit (no test — pure constants)**

```bash
git add src/lib/paths.ts
git commit -m "feat: add path constants for cache + support + LaunchAgent"
```

---

### Task 7: `src/lib/flags.ts` — flag-file toggles (TDD)

**Files:**
- Create: `src/lib/__tests__/flags.test.ts`
- Create: `src/lib/flags.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/flags.test.ts`:

```ts
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { isFlagSet, setFlag, clearFlag, toggleFlag } from "../flags";

describe("flags", () => {
  let tmpDir: string;
  let flagPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ls-flags-"));
    flagPath = path.join(tmpDir, "test.off");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("isFlagSet returns false when flag absent", async () => {
    await expect(isFlagSet(flagPath)).resolves.toBe(false);
  });

  test("setFlag creates the file; isFlagSet returns true", async () => {
    await setFlag(flagPath);
    await expect(isFlagSet(flagPath)).resolves.toBe(true);
  });

  test("clearFlag removes the file; isFlagSet returns false", async () => {
    await setFlag(flagPath);
    await clearFlag(flagPath);
    await expect(isFlagSet(flagPath)).resolves.toBe(false);
  });

  test("clearFlag is idempotent when file missing", async () => {
    await expect(clearFlag(flagPath)).resolves.not.toThrow();
  });

  test("toggleFlag returns new state (true→false, false→true)", async () => {
    await expect(toggleFlag(flagPath)).resolves.toBe(true);
    await expect(toggleFlag(flagPath)).resolves.toBe(false);
  });

  test("setFlag creates parent directories if missing", async () => {
    const nested = path.join(tmpDir, "a", "b", "c", "test.off");
    await setFlag(nested);
    await expect(isFlagSet(nested)).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npm test -- flags.test.ts`
Expected: FAIL with "Cannot find module '../flags'".

- [ ] **Step 3: Implement `src/lib/flags.ts`**

```ts
import { promises as fs } from "fs";
import path from "path";

export async function isFlagSet(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function setFlag(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "", { flag: "w" });
}

export async function clearFlag(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export async function toggleFlag(filePath: string): Promise<boolean> {
  if (await isFlagSet(filePath)) {
    await clearFlag(filePath);
    return false;
  }
  await setFlag(filePath);
  return true;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- flags.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/flags.ts src/lib/__tests__/flags.test.ts
git commit -m "feat: add flag-file toggle helpers"
```

---

### Task 8: `src/lib/audio-format.ts` — `audio_format` CLI wrapper (TDD)

**Files:**
- Create: `src/lib/__tests__/audio-format.test.ts`
- Create: `src/lib/audio-format.ts`

The CLI's `list` output is JSON shaped like `{"items":[{"title":"24-bit Integer · 96 kHz", "arg":"96000 24 int", ...}]}`. We parse this into typed `AudioFormat` records.

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/audio-format.test.ts`:

```ts
import { parseListOutput, parseCurrentOutput, formatToCliArg } from "../audio-format";

describe("audio-format CLI parser", () => {
  test("parseListOutput extracts formats from CLI JSON", () => {
    const stdout = JSON.stringify({
      items: [
        {
          uid: "44100-16-int",
          title: "✓ 16-bit Integer · 44.1 kHz",
          subtitle: "Set DAC X to 16-bit Integer · 44.1 kHz",
          arg: "44100 16 int",
        },
        {
          uid: "96000-24-int",
          title: "24-bit Integer · 96 kHz",
          subtitle: "Set DAC X to 24-bit Integer · 96 kHz",
          arg: "96000 24 int",
        },
      ],
    });

    expect(parseListOutput(stdout)).toEqual([
      { rate: 44100, bits: 16, isFloat: false, isCurrent: true,  label: "16-bit Integer · 44.1 kHz" },
      { rate: 96000, bits: 24, isFloat: false, isCurrent: false, label: "24-bit Integer · 96 kHz" },
    ]);
  });

  test("parseListOutput handles empty list", () => {
    const stdout = JSON.stringify({ items: [{ title: "No formats available", valid: false }] });
    expect(parseListOutput(stdout)).toEqual([]);
  });

  test("parseListOutput throws on non-JSON input", () => {
    expect(() => parseListOutput("not json")).toThrow();
  });

  test("parseCurrentOutput extracts device + label", () => {
    const stdout = "Built-in Output: 24-bit Integer · 96 kHz\n";
    expect(parseCurrentOutput(stdout)).toEqual({
      device: "Built-in Output",
      label: "24-bit Integer · 96 kHz",
    });
  });

  test("parseCurrentOutput returns null on unparseable input", () => {
    expect(parseCurrentOutput("garbage")).toBeNull();
  });

  test("formatToCliArg builds args array", () => {
    expect(formatToCliArg({ rate: 96000, bits: 24, isFloat: false })).toEqual([
      "set", "96000", "24", "int",
    ]);
    expect(formatToCliArg({ rate: 96000, bits: 32, isFloat: true })).toEqual([
      "set", "96000", "32", "float",
    ]);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npm test -- audio-format.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/audio-format.ts`**

```ts
import { execFile } from "child_process";
import { promisify } from "util";
import { AUDIO_FORMAT_BIN } from "./paths";

const execFileP = promisify(execFile);

export interface AudioFormat {
  rate: number;
  bits: number;
  isFloat: boolean;
  isCurrent: boolean;
  label: string;
}

export interface CurrentFormat {
  device: string;
  label: string;
}

interface CliItem {
  uid?: string;
  title?: string;
  subtitle?: string;
  arg?: string;
  valid?: boolean;
}

export function parseListOutput(stdout: string): AudioFormat[] {
  const parsed = JSON.parse(stdout) as { items?: CliItem[] };
  const items = parsed.items ?? [];
  const formats: AudioFormat[] = [];
  for (const item of items) {
    if (item.valid === false) continue;
    if (!item.arg || !item.title) continue;
    const argParts = item.arg.split(" ");
    if (argParts.length < 3) continue;
    const rate = Number(argParts[0]);
    const bits = Number(argParts[1]);
    if (!Number.isFinite(rate) || !Number.isFinite(bits)) continue;
    const isFloat = argParts[2] === "float";
    const isCurrent = item.title.startsWith("✓ ");
    const label = item.title.replace(/^✓\s*/, "");
    formats.push({ rate, bits, isFloat, isCurrent, label });
  }
  return formats;
}

export function parseCurrentOutput(stdout: string): CurrentFormat | null {
  const trimmed = stdout.trim();
  const m = /^(.+?):\s+(.+)$/.exec(trimmed);
  if (!m) return null;
  return { device: m[1], label: m[2] };
}

export function formatToCliArg(fmt: { rate: number; bits: number; isFloat: boolean }): string[] {
  return ["set", String(fmt.rate), String(fmt.bits), fmt.isFloat ? "float" : "int"];
}

export async function listFormats(): Promise<AudioFormat[]> {
  const { stdout } = await execFileP(AUDIO_FORMAT_BIN, ["list"]);
  return parseListOutput(stdout);
}

export async function getCurrentFormat(): Promise<CurrentFormat | null> {
  try {
    const { stdout } = await execFileP(AUDIO_FORMAT_BIN, ["current"]);
    return parseCurrentOutput(stdout);
  } catch {
    return null;
  }
}

export async function setFormat(fmt: { rate: number; bits: number; isFloat: boolean }): Promise<void> {
  await execFileP(AUDIO_FORMAT_BIN, formatToCliArg(fmt));
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- audio-format.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio-format.ts src/lib/__tests__/audio-format.test.ts
git commit -m "feat: add audio_format CLI wrapper with parsers"
```

---

### Task 9: `src/lib/nowplaying.ts` — JSON cache reader (TDD)

**Files:**
- Create: `src/lib/__tests__/nowplaying.test.ts`
- Create: `src/lib/nowplaying.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/nowplaying.test.ts`:

```ts
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { readNowPlaying, formatSummary, NowPlaying } from "../nowplaying";

describe("nowplaying reader", () => {
  let tmpDir: string;
  let cachePath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ls-np-"));
    cachePath = path.join(tmpDir, "nowplaying.json");
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("readNowPlaying returns null when file missing", async () => {
    await expect(readNowPlaying(cachePath)).resolves.toBeNull();
  });

  test("readNowPlaying parses valid payload", async () => {
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        timestamp: 1714650000,
        format: "alac",
        rendition: "Hi-Res Lossless",
        sampleRate: 96000,
        bitDepth: 24,
        channels: 2,
        source: "report",
      })
    );
    const np = await readNowPlaying(cachePath);
    expect(np).toEqual({
      timestamp: 1714650000,
      format: "alac",
      rendition: "Hi-Res Lossless",
      sampleRate: 96000,
      bitDepth: 24,
      channels: 2,
    });
  });

  test("readNowPlaying returns null on corrupt JSON", async () => {
    await fs.writeFile(cachePath, "not valid json {");
    await expect(readNowPlaying(cachePath)).resolves.toBeNull();
  });

  test("formatSummary builds string for ALAC hi-res", () => {
    const np: NowPlaying = {
      timestamp: 0,
      format: "alac",
      rendition: "Hi-Res Lossless",
      sampleRate: 96000,
      bitDepth: 24,
      channels: 2,
    };
    expect(formatSummary(np)).toBe("96 kHz · 24-bit · Hi-Res Lossless (ALAC)");
  });

  test("formatSummary handles AAC (no bit depth)", () => {
    const np: NowPlaying = {
      timestamp: 0,
      format: "aac",
      rendition: "",
      sampleRate: 44100,
      bitDepth: null,
      channels: 2,
    };
    expect(formatSummary(np)).toBe("44.1 kHz (AAC)");
  });

  test("formatSummary handles 88.2 kHz fractional rate", () => {
    const np: NowPlaying = {
      timestamp: 0,
      format: "alac",
      rendition: "Lossless",
      sampleRate: 88200,
      bitDepth: 24,
      channels: 2,
    };
    expect(formatSummary(np)).toBe("88.2 kHz · 24-bit · Lossless (ALAC)");
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npm test -- nowplaying.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/nowplaying.ts`**

```ts
import { promises as fs } from "fs";

export interface NowPlaying {
  timestamp: number;
  format: string;
  rendition: string;
  sampleRate: number | null;
  bitDepth: number | null;
  channels: number | null;
}

interface CachePayload {
  timestamp?: number;
  format?: string;
  rendition?: string;
  sampleRate?: number | null;
  bitDepth?: number | null;
  channels?: number | null;
}

export async function readNowPlaying(filePath: string): Promise<NowPlaying | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  let payload: CachePayload;
  try {
    payload = JSON.parse(raw) as CachePayload;
  } catch {
    return null;
  }
  return {
    timestamp: payload.timestamp ?? 0,
    format: payload.format ?? "",
    rendition: payload.rendition ?? "",
    sampleRate: payload.sampleRate ?? null,
    bitDepth: payload.bitDepth ?? null,
    channels: payload.channels ?? null,
  };
}

function rateLabel(hz: number): string {
  const khz = hz / 1000;
  return Number.isInteger(khz) ? `${khz} kHz` : `${khz.toFixed(1)} kHz`;
}

function codecLabel(format: string): string {
  switch (format.toLowerCase()) {
    case "qlac":
    case "alac":
      return "ALAC";
    case "qaac":
    case "aac":
    case "aach":
    case "aacp":
      return "AAC";
    case "lpcm":
    case "pcm":
      return "PCM";
    case "flac":
      return "FLAC";
    default:
      return format.toUpperCase();
  }
}

export function formatSummary(np: NowPlaying): string {
  const parts: string[] = [];
  if (np.sampleRate) parts.push(rateLabel(np.sampleRate));
  if (np.bitDepth && np.bitDepth > 0) parts.push(`${np.bitDepth}-bit`);
  if (np.rendition) parts.push(np.rendition);
  const head = parts.join(" · ");
  const codec = codecLabel(np.format);
  return head ? `${head} (${codec})` : `(${codec})`;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- nowplaying.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nowplaying.ts src/lib/__tests__/nowplaying.test.ts
git commit -m "feat: add nowplaying.json reader + format summary"
```

---

### Task 10: `src/lib/applescript.ts` — Music.app metadata fetch

**Files:**
- Create: `src/lib/applescript.ts`

This file shells out to `osascript`; not unit-tested (depends on Music.app). Tested via integration — by running the extension.

- [ ] **Step 1: Write the file**

```ts
import { execFile } from "child_process";
import { promisify } from "util";

const execFileP = promisify(execFile);

export type PlayerState = "playing" | "paused" | "stopped" | "not-running" | "no-track";

export interface MusicState {
  state: PlayerState;
  name: string;
  artist: string;
  album: string;
  kind: string;
  trackClass: string;        // "file track" | "shared track" | etc.
  sampleRate: number | null; // local files only; streaming returns 0
  bitRate: number | null;    // kbps; AAC streaming or local files
}

const SCRIPT = `
on safeGet(s)
    try
        if s is missing value then return ""
        return s as string
    on error
        return ""
    end try
end safeGet

if application "Music" is not running then return "NOT_RUNNING"
tell application "Music"
    set ps to (player state as string)
    if ps is "stopped" then return "STOPPED"
    try
        set t to current track
    on error
        return "NO_TRACK"
    end try
    set nm to my safeGet(name of t)
    set ar to my safeGet(artist of t)
    set al to my safeGet(album of t)
    set kd to my safeGet(kind of t)
    set cl to (class of t as string)
    set sr to my safeGet(sample rate of t)
    set br to my safeGet(bit rate of t)
    return ps & tab & nm & tab & ar & tab & al & tab & kd & tab & cl & tab & sr & tab & br
end tell
`;

export async function fetchMusicState(): Promise<MusicState> {
  let raw = "";
  try {
    const { stdout } = await execFileP("/usr/bin/osascript", ["-e", SCRIPT], { timeout: 3000 });
    raw = stdout.trim();
  } catch {
    return emptyState("not-running");
  }

  if (raw === "NOT_RUNNING") return emptyState("not-running");
  if (raw === "STOPPED") return emptyState("stopped");
  if (raw === "NO_TRACK") return emptyState("no-track");

  const parts = raw.split("\t");
  if (parts.length < 8) return emptyState("not-running");
  const [state, name, artist, album, kind, trackClass, sr, br] = parts;
  return {
    state: state === "playing" || state === "paused" ? state : "stopped",
    name, artist, album, kind, trackClass,
    sampleRate: parseNumber(sr),
    bitRate: parseNumber(br),
  };
}

function parseNumber(s: string): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function emptyState(state: PlayerState): MusicState {
  return {
    state,
    name: "", artist: "", album: "", kind: "", trackClass: "",
    sampleRate: null, bitRate: null,
  };
}

export function isLocalTrack(s: MusicState): boolean {
  return s.trackClass.includes("file track");
}
```

- [ ] **Step 2: Smoke-test (manual — requires Music.app running)**

Run (in a Node REPL or a temp script):
```bash
npx tsx -e "import('./src/lib/applescript.ts').then(m => m.fetchMusicState().then(console.log))"
```

Expected (with Music.app playing): a populated `MusicState` object. With Music.app not running: `{state: 'not-running', ...}`.

(Skip if Music.app not available; this module is integration-tested via the commands.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/applescript.ts
git commit -m "feat: add Music.app metadata fetch via osascript"
```

---

### Task 11: `src/lib/format-display.ts` — human-readable format string from `MusicState`

**Files:**
- Create: `src/lib/__tests__/format-display.test.ts`
- Create: `src/lib/format-display.ts`

This module decides which format string to show: streaming (from `nowplaying.json`) or local (from `MusicState`).

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/format-display.test.ts`:

```ts
import { resolveFormatLine } from "../format-display";
import type { MusicState } from "../applescript";
import type { NowPlaying } from "../nowplaying";

const baseMusic: MusicState = {
  state: "playing",
  name: "Track",
  artist: "Artist",
  album: "Album",
  kind: "Apple Music",
  trackClass: "URL track",
  sampleRate: null,
  bitRate: null,
};

describe("resolveFormatLine", () => {
  test("local file uses AppleScript metadata", () => {
    const state: MusicState = {
      ...baseMusic,
      trackClass: "file track",
      kind: "MPEG-4 audio file",
      sampleRate: 44100,
      bitRate: 256,
    };
    expect(resolveFormatLine(state, null)).toBe("44.1 kHz · 256 kbps · MPEG-4 audio file");
  });

  test("local file without bit rate omits kbps", () => {
    const state: MusicState = {
      ...baseMusic,
      trackClass: "file track",
      kind: "FLAC",
      sampleRate: 96000,
      bitRate: null,
    };
    expect(resolveFormatLine(state, null)).toBe("96 kHz · FLAC");
  });

  test("streaming track uses nowplaying.json", () => {
    const np: NowPlaying = {
      timestamp: 0,
      format: "alac",
      rendition: "Hi-Res Lossless",
      sampleRate: 96000,
      bitDepth: 24,
      channels: 2,
    };
    expect(resolveFormatLine(baseMusic, np)).toBe("96 kHz · 24-bit · Hi-Res Lossless (ALAC)");
  });

  test("streaming with no cache yet shows hint", () => {
    expect(resolveFormatLine(baseMusic, null)).toBe(
      "Format not captured yet — skip to next track"
    );
  });

  test("local file with no rate falls back gracefully", () => {
    const state: MusicState = {
      ...baseMusic,
      trackClass: "file track",
      sampleRate: null,
    };
    expect(resolveFormatLine(state, null)).toBe("Format info unavailable");
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npm test -- format-display.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/format-display.ts`**

```ts
import { isLocalTrack, MusicState } from "./applescript";
import { formatSummary, NowPlaying } from "./nowplaying";

function rateLabel(hz: number): string {
  const khz = hz / 1000;
  return Number.isInteger(khz) ? `${khz} kHz` : `${khz.toFixed(1)} kHz`;
}

export function resolveFormatLine(music: MusicState, np: NowPlaying | null): string {
  if (isLocalTrack(music)) {
    if (!music.sampleRate) return "Format info unavailable";
    const parts = [rateLabel(music.sampleRate)];
    if (music.bitRate) parts.push(`${music.bitRate} kbps`);
    parts.push(music.kind || "local file");
    return parts.join(" · ");
  }
  if (!np || !np.sampleRate) return "Format not captured yet — skip to next track";
  return formatSummary(np);
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- format-display.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format-display.ts src/lib/__tests__/format-display.test.ts
git commit -m "feat: add format line resolver bridging local/streaming sources"
```

---

### Task 12: `src/lib/daemon.ts` — LaunchAgent management

**Files:**
- Create: `assets/plist.template`
- Create: `src/lib/daemon.ts`

- [ ] **Step 1: Create `assets/plist.template`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>__BUNDLE_ID__</string>
    <key>ProgramArguments</key>
    <array>
        <string>__WATCHER_BIN__</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>__WATCHER_OUT__</string>
    <key>StandardErrorPath</key>
    <string>__WATCHER_ERR__</string>
</dict>
</plist>
```

- [ ] **Step 2: Implement `src/lib/daemon.ts`**

```ts
import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { environment } from "@raycast/api";
import {
  AUDIO_FORMAT_BIN,
  BUNDLE_ID,
  CACHE_DIR,
  DAEMON_OFF_FLAG,
  LAUNCH_AGENTS_DIR,
  PLIST_PATH,
  SUPPORT_DIR,
  WATCHER_BIN,
  OLD_ALFRED_BUNDLE_ID,
  OLD_ALFRED_PLIST_PATH,
  OLD_ALFRED_SUPPORT_DIR,
  OLD_ALFRED_CACHE_DIR,
} from "./paths";
import { clearFlag, isFlagSet, setFlag } from "./flags";

const execFileP = promisify(execFile);

export type DaemonStatus = "running" | "stopped" | "not-installed";

export async function status(): Promise<DaemonStatus> {
  if (!(await fileExists(PLIST_PATH))) return "not-installed";
  const uid = process.getuid?.() ?? 0;
  try {
    await execFileP("/bin/launchctl", ["print", `gui/${uid}/${BUNDLE_ID}`]);
    return "running";
  } catch {
    return "stopped";
  }
}

export async function ensureInstalled(): Promise<void> {
  await fs.mkdir(SUPPORT_DIR, { recursive: true });
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(LAUNCH_AGENTS_DIR, { recursive: true });

  await copyAsset("lossless-watcher", WATCHER_BIN);
  await copyAsset("audio_format", AUDIO_FORMAT_BIN);
  await fs.chmod(WATCHER_BIN, 0o755);
  await fs.chmod(AUDIO_FORMAT_BIN, 0o755);

  await writePlist();

  if (!(await isFlagSet(DAEMON_OFF_FLAG))) {
    await bootstrap();
  }
}

async function copyAsset(name: string, dest: string): Promise<void> {
  const src = path.join(environment.assetsPath, name);
  await fs.copyFile(src, dest);
}

async function writePlist(): Promise<void> {
  const tplPath = path.join(environment.assetsPath, "plist.template");
  let tpl = await fs.readFile(tplPath, "utf8");
  tpl = tpl
    .replaceAll("__BUNDLE_ID__", BUNDLE_ID)
    .replaceAll("__WATCHER_BIN__", WATCHER_BIN)
    .replaceAll("__WATCHER_OUT__", path.join(CACHE_DIR, "watcher.out"))
    .replaceAll("__WATCHER_ERR__", path.join(CACHE_DIR, "watcher.err"));
  await fs.writeFile(PLIST_PATH, tpl, "utf8");
}

async function bootstrap(): Promise<void> {
  const uid = process.getuid?.() ?? 0;
  // bootout first to make this idempotent — ignore errors (it's not loaded yet).
  try {
    await execFileP("/bin/launchctl", ["bootout", `gui/${uid}/${BUNDLE_ID}`]);
  } catch {
    // not loaded — fine
  }
  await execFileP("/bin/launchctl", ["bootstrap", `gui/${uid}`, PLIST_PATH]);
}

export async function start(): Promise<void> {
  await clearFlag(DAEMON_OFF_FLAG);
  await bootstrap();
}

export async function stop(): Promise<void> {
  const uid = process.getuid?.() ?? 0;
  try {
    await execFileP("/bin/launchctl", ["bootout", `gui/${uid}/${BUNDLE_ID}`]);
  } catch {
    // already stopped — fine
  }
  await setFlag(DAEMON_OFF_FLAG);
}

export interface UninstallResult {
  successes: string[];
  failures: { path: string; error: string }[];
}

export async function uninstall(): Promise<UninstallResult> {
  const uid = process.getuid?.() ?? 0;
  const result: UninstallResult = { successes: [], failures: [] };

  try {
    await execFileP("/bin/launchctl", ["bootout", `gui/${uid}/${BUNDLE_ID}`]);
    result.successes.push("launchctl bootout");
  } catch (err) {
    // not loaded — not a real failure
    result.successes.push("launchctl bootout (was not running)");
  }

  for (const target of [PLIST_PATH, SUPPORT_DIR, CACHE_DIR]) {
    try {
      await fs.rm(target, { recursive: true, force: true });
      result.successes.push(target);
    } catch (err) {
      result.failures.push({ path: target, error: (err as Error).message });
    }
  }

  return result;
}

export async function detectOldAlfredDaemon(): Promise<boolean> {
  const uid = process.getuid?.() ?? 0;
  if (await fileExists(OLD_ALFRED_PLIST_PATH)) return true;
  try {
    await execFileP("/bin/launchctl", ["print", `gui/${uid}/${OLD_ALFRED_BUNDLE_ID}`]);
    return true;
  } catch {
    return false;
  }
}

export async function uninstallOldAlfred(): Promise<UninstallResult> {
  const uid = process.getuid?.() ?? 0;
  const result: UninstallResult = { successes: [], failures: [] };
  try {
    await execFileP("/bin/launchctl", ["bootout", `gui/${uid}/${OLD_ALFRED_BUNDLE_ID}`]);
    result.successes.push("launchctl bootout (old)");
  } catch {
    result.successes.push("launchctl bootout (old, was not running)");
  }
  for (const target of [OLD_ALFRED_PLIST_PATH, OLD_ALFRED_SUPPORT_DIR, OLD_ALFRED_CACHE_DIR]) {
    try {
      await fs.rm(target, { recursive: true, force: true });
      result.successes.push(target);
    } catch (err) {
      result.failures.push({ path: target, error: (err as Error).message });
    }
  }
  return result;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Smoke-test `status()` returns `not-installed` cleanly**

Create `/tmp/daemon-smoke.ts`:
```ts
import { status } from "./src/lib/daemon";
status().then(s => console.log("status:", s));
```

Run: `npx tsx /tmp/daemon-smoke.ts`
Expected: `status: not-installed` (assuming nothing pre-installed) or `running`/`stopped` depending on prior state. No exception thrown.

Cleanup: `rm /tmp/daemon-smoke.ts`

- [ ] **Step 4: Commit**

```bash
git add src/lib/daemon.ts assets/plist.template
git commit -m "feat: add LaunchAgent daemon management"
```

---

### Task 13: `src/lib/artwork.ts` — iTunes Search artwork fetcher

**Files:**
- Create: `src/lib/artwork.ts`

iTunes Search API: `https://itunes.apple.com/search?term=<query>&media=music&entity=song&limit=1`. Cache files keyed by sha256 of `artist|title`.

- [ ] **Step 1: Implement `src/lib/artwork.ts`**

```ts
import { promises as fs } from "fs";
import { createHash } from "crypto";
import path from "path";
import { ARTWORK_DIR } from "./paths";

export async function fetchArtwork(artist: string, title: string): Promise<string | null> {
  if (!artist && !title) return null;
  await fs.mkdir(ARTWORK_DIR, { recursive: true });
  const key = createHash("sha256").update(`${artist}|${title}`).digest("hex").slice(0, 16);
  const dest = path.join(ARTWORK_DIR, `${key}.jpg`);

  if (await fileExists(dest)) return dest;

  const term = encodeURIComponent(`${artist} ${title}`.trim());
  const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`;

  let json: { results?: { artworkUrl100?: string }[] };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    json = (await res.json()) as typeof json;
  } catch {
    return null;
  }
  const small = json.results?.[0]?.artworkUrl100;
  if (!small) return null;
  // Replace 100x100bb.jpg with 600x600bb.jpg for higher resolution
  const big = small.replace(/\/\d+x\d+bb\.jpg$/, "/600x600bb.jpg");
  try {
    const imgRes = await fetch(big, { signal: AbortSignal.timeout(5000) });
    if (!imgRes.ok) return null;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    await fs.writeFile(dest, buf);
    return dest;
  } catch {
    return null;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Smoke-test (manual)**

Create `/tmp/artwork-smoke.ts`:
```ts
import { fetchArtwork } from "./src/lib/artwork";
fetchArtwork("Daft Punk", "Get Lucky").then(p => console.log("path:", p));
```

Run: `npx tsx /tmp/artwork-smoke.ts`
Expected: prints `path: /Users/.../Library/Caches/com.ariestwn.lossless-switcher/artwork/<hash>.jpg`. File exists. Re-run is fast (cache hit).

Cleanup: `rm /tmp/artwork-smoke.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/artwork.ts
git commit -m "feat: add iTunes Search artwork fetcher with cache"
```

---

## Phase 4 — Commands

### Task 14: `src/now-playing.tsx` — Now Playing view command

**Files:**
- Create: `src/now-playing.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { fetchMusicState, MusicState } from "./lib/applescript";
import { readNowPlaying, NowPlaying } from "./lib/nowplaying";
import { resolveFormatLine } from "./lib/format-display";
import { fetchArtwork } from "./lib/artwork";
import {
  status as daemonStatus,
  ensureInstalled,
  start as daemonStart,
  stop as daemonStop,
  detectOldAlfredDaemon,
  uninstallOldAlfred,
  DaemonStatus,
} from "./lib/daemon";
import { isFlagSet, toggleFlag } from "./lib/flags";
import { AUTOAPPLY_OFF_FLAG, NOWPLAYING_PATH } from "./lib/paths";

interface ViewModel {
  music: MusicState;
  np: NowPlaying | null;
  formatLine: string;
  daemon: DaemonStatus;
  autoFollow: boolean;
  artwork: string | null;
  hasOldAlfred: boolean;
}

const POLL_MS = 2000;
const SWITCH_FORMAT_DEEPLINK =
  "raycast://extensions/ariestwn/lossless-switcher/switch-format";

export default function NowPlaying() {
  const [vm, setVm] = useState<ViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const artworkRef = useRef<{ key: string; path: string | null }>({ key: "", path: null });

  useEffect(() => {
    let cancelled = false;
    let timer: NodeJS.Timeout | null = null;

    async function tick() {
      try {
        await ensureInstalled();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Daemon setup failed",
          message: (err as Error).message,
        });
      }
      const [music, np, daemon, autoOff, hasOldAlfred] = await Promise.all([
        fetchMusicState(),
        readNowPlaying(NOWPLAYING_PATH),
        daemonStatus(),
        isFlagSet(AUTOAPPLY_OFF_FLAG),
        detectOldAlfredDaemon(),
      ]);
      const formatLine = resolveFormatLine(music, np);

      const newKey = `${music.artist}|${music.name}`;
      if (newKey !== artworkRef.current.key && music.name) {
        const path = await fetchArtwork(music.artist, music.name);
        artworkRef.current = { key: newKey, path };
      }

      if (cancelled) return;
      setVm({
        music,
        np,
        formatLine,
        daemon,
        autoFollow: !autoOff,
        artwork: artworkRef.current.path,
        hasOldAlfred,
      });
      setLoading(false);
    }

    tick();
    timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  const markdown = vm ? buildMarkdown(vm) : "Loading…";

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={vm ? <Actions vm={vm} /> : undefined}
    />
  );
}

function buildMarkdown(vm: ViewModel): string {
  const { music, formatLine, daemon, autoFollow, artwork, hasOldAlfred } = vm;
  const lines: string[] = [];

  if (hasOldAlfred) {
    lines.push(
      "> ⚠️ **Old Alfred workflow detected.** Run **Cleanup Old Alfred** action below to avoid double format-applies."
    );
    lines.push("");
  }

  if (music.state === "not-running") {
    return [
      ...lines,
      "## Apple Music is not running",
      "",
      "Open Apple Music and start playback to see the live audio format.",
    ].join("\n");
  }

  if (music.state === "stopped" || music.state === "no-track") {
    return [
      ...lines,
      "## Music is stopped",
      "",
      "Start a track to see the live audio format.",
    ].join("\n");
  }

  if (artwork) {
    lines.push(`![](file://${artwork}?raycast-width=200&raycast-height=200)`);
    lines.push("");
  }
  lines.push(`## ${music.name || "Unknown title"}`);
  if (music.artist) lines.push(`**${music.artist}**`);
  if (music.album) lines.push(`*${music.album}*`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`**Format:** ${formatLine}`);
  lines.push("");
  const daemonLabel =
    daemon === "running"
      ? `🟢 Daemon running · auto-follow ${autoFollow ? "ON" : "OFF"}`
      : daemon === "stopped"
        ? "🔴 Daemon stopped"
        : "⚪️ Daemon not installed";
  lines.push(daemonLabel);

  return lines.join("\n");
}

function Actions({ vm }: { vm: ViewModel }) {
  return (
    <ActionPanel>
      <Action
        title="Switch Audio Format"
        icon={Icon.Switch}
        onAction={() => open(SWITCH_FORMAT_DEEPLINK)}
      />
      <Action
        title={vm.autoFollow ? "Disable Auto-Follow" : "Enable Auto-Follow"}
        icon={Icon.Repeat}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={async () => {
          const set = await toggleFlag(AUTOAPPLY_OFF_FLAG);
          await showHUD(set ? "Auto-follow OFF" : "Auto-follow ON");
        }}
      />
      <Action.CopyToClipboard
        title="Copy Format Summary"
        content={`${vm.music.name} — ${vm.music.artist} (${vm.formatLine})`}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {vm.daemon === "stopped" && (
        <Action
          title="Start Daemon"
          icon={Icon.Play}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={async () => {
            await daemonStart();
            await showHUD("Daemon started");
          }}
        />
      )}
      {vm.daemon === "running" && (
        <Action
          title="Stop Daemon"
          icon={Icon.Stop}
          shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
          onAction={async () => {
            await daemonStop();
            await showHUD("Daemon stopped");
          }}
        />
      )}
      {vm.hasOldAlfred && (
        <Action
          title="Cleanup Old Alfred Daemon"
          icon={Icon.Trash}
          onAction={async () => {
            const r = await uninstallOldAlfred();
            await showHUD(
              r.failures.length === 0
                ? "Old Alfred daemon removed"
                : `Removed with ${r.failures.length} issue(s)`
            );
          }}
        />
      )}
      <Action.Open
        title="Open Apple Music"
        icon={Icon.Music}
        target="/System/Applications/Music.app"
      />
    </ActionPanel>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: passes (or only formatting warnings, fixable with `npm run fix-lint`).

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev` (this runs `ray develop`)
1. Open Raycast (⌘+space).
2. Search "Now Playing".
3. Confirm: with Music.app playing, you see the track + format line + daemon status.
4. Test action: ⌘T toggles auto-follow (HUD).
5. Test action: ⌘C copies format summary.

Document the actual observed behavior in the commit message if anything diverges.

- [ ] **Step 4: Commit**

```bash
git add src/now-playing.tsx
git commit -m "feat: add Now Playing view command"
```

---

### Task 15: `src/switch-format.tsx` — Switch Audio Format view

**Files:**
- Create: `src/switch-format.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, showHUD, showToast } from "@raycast/api";
import { listFormats, setFormat, AudioFormat } from "./lib/audio-format";
import { ensureInstalled } from "./lib/daemon";

export default function SwitchFormat() {
  const [formats, setFormats] = useState<AudioFormat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await ensureInstalled();
        const list = await listFormats();
        setFormats(list);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Couldn't list formats",
          message: (err as Error).message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = formats.find((f) => f.isCurrent);
  const others = formats.filter((f) => !f.isCurrent);

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter formats">
      {current && (
        <List.Section title="Current">
          <List.Item
            key={fmtKey(current)}
            title={current.label}
            icon={Icon.CheckCircle}
            accessories={[{ text: "applied" }]}
          />
        </List.Section>
      )}
      <List.Section title="Available">
        {others.map((f) => (
          <List.Item
            key={fmtKey(f)}
            title={f.label}
            icon={Icon.Sound}
            actions={
              <ActionPanel>
                <Action
                  title={`Set ${f.label}`}
                  icon={Icon.Check}
                  onAction={async () => {
                    try {
                      await setFormat(f);
                      await showHUD(`→ ${f.label}`);
                    } catch (err) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Couldn't apply format",
                        message: (err as Error).message,
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function fmtKey(f: AudioFormat): string {
  return `${f.rate}-${f.bits}-${f.isFloat ? "float" : "int"}`;
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. In Raycast, run "Switch Audio Format". Verify:
- List shows current format with checkmark, others below.
- Selecting a format and pressing Enter applies it; HUD shows "→ <label>".
- Open Audio MIDI Setup to confirm DAC actually changed.

- [ ] **Step 4: Commit**

```bash
git add src/switch-format.tsx
git commit -m "feat: add Switch Audio Format command"
```

---

### Task 16: `src/toggle-auto-follow.ts` — no-view toggle

**Files:**
- Create: `src/toggle-auto-follow.ts`

- [ ] **Step 1: Write the file**

```ts
import { showHUD } from "@raycast/api";
import { ensureInstalled } from "./lib/daemon";
import { toggleFlag } from "./lib/flags";
import { AUTOAPPLY_OFF_FLAG } from "./lib/paths";

export default async function Command() {
  await ensureInstalled();
  const set = await toggleFlag(AUTOAPPLY_OFF_FLAG);
  // toggleFlag returns true if the flag is now SET (= auto-follow disabled)
  await showHUD(set ? "Auto-follow OFF" : "Auto-follow ON");
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. In Raycast, run "Toggle Auto-Follow" twice. Each invocation flips the HUD between ON / OFF. Verify by checking `~/Library/Application Support/com.ariestwn.lossless-switcher/autoapply.off` exists or not after each run.

- [ ] **Step 4: Commit**

```bash
git add src/toggle-auto-follow.ts
git commit -m "feat: add Toggle Auto-Follow command"
```

---

### Task 17: `src/menu-bar.tsx` — Lossless Status menu-bar

**Files:**
- Create: `src/menu-bar.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { Icon, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchMusicState, MusicState } from "./lib/applescript";
import { readNowPlaying, NowPlaying } from "./lib/nowplaying";
import { resolveFormatLine } from "./lib/format-display";
import { ensureInstalled, status as daemonStatus, DaemonStatus } from "./lib/daemon";
import { getCurrentFormat, CurrentFormat } from "./lib/audio-format";
import { NOWPLAYING_PATH } from "./lib/paths";

interface BarVM {
  title: string;
  subtitle: string;
  music: MusicState;
  np: NowPlaying | null;
  daemon: DaemonStatus;
  current: CurrentFormat | null;
}

export default function MenuBar() {
  const [vm, setVm] = useState<BarVM | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await ensureInstalled();
      } catch {
        // tolerate — show offline state
      }
      const [music, np, daemon, current] = await Promise.all([
        fetchMusicState(),
        readNowPlaying(NOWPLAYING_PATH),
        daemonStatus(),
        getCurrentFormat(),
      ]);
      const playing = music.state === "playing" || music.state === "paused";
      const title = playing && np?.sampleRate ? rateLabel(np.sampleRate) : current ? current.label.split(" · ")[1] ?? "" : "";
      const subtitle = playing ? resolveFormatLine(music, np) : current ? current.label : "Idle";
      setVm({ title, subtitle, music, np, daemon, current });
    })();
  }, []);

  const icon = vm?.daemon === "running" ? Icon.Music : Icon.Dot;

  return (
    <MenuBarExtra title={vm?.title ?? ""} icon={icon} tooltip={vm?.subtitle ?? "Loading…"}>
      <MenuBarExtra.Section title={vm?.music.name || "Not playing"}>
        {vm?.music.artist && <MenuBarExtra.Item title={vm.music.artist} />}
        <MenuBarExtra.Item title={vm?.subtitle ?? ""} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Now Playing"
          icon={Icon.Eye}
          onAction={() => open("raycast://extensions/ariestwn/lossless-switcher/now-playing")}
        />
        <MenuBarExtra.Item
          title="Switch Audio Format"
          icon={Icon.Switch}
          onAction={() => open("raycast://extensions/ariestwn/lossless-switcher/switch-format")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Refresh Interval…"
          icon={Icon.Gear}
          onAction={() => openCommandPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function rateLabel(hz: number): string {
  const khz = hz / 1000;
  return Number.isInteger(khz) ? `${khz} kHz` : `${khz.toFixed(1)} kHz`;
}
```

Note: Raycast's `menu-bar` command minimum interval is `1m` (set in `package.json`). Live updates within a 1-minute window happen on click (re-renders on open). For sub-1-minute live updates the user can re-click the icon.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. Enable the menu-bar command in Raycast preferences. Verify:
- Icon appears in macOS menubar.
- Title shows current sample rate when Music is playing.
- Click → dropdown shows track name, artist, format line, "Open Now Playing".

- [ ] **Step 4: Commit**

```bash
git add src/menu-bar.tsx
git commit -m "feat: add Lossless Status menu-bar command"
```

---

### Task 18: `src/uninstall-daemon.tsx` — explicit cleanup command

**Files:**
- Create: `src/uninstall-daemon.tsx`

This command is `view` mode (despite being a destructive action) so we can render a `confirmAlert` before doing anything.

- [ ] **Step 1: Write the file**

```tsx
import { useEffect } from "react";
import {
  Alert,
  Detail,
  Toast,
  closeMainWindow,
  confirmAlert,
  showHUD,
  showToast,
} from "@raycast/api";
import { uninstall } from "./lib/daemon";

export default function UninstallDaemon() {
  useEffect(() => {
    (async () => {
      const ok = await confirmAlert({
        title: "Uninstall daemon?",
        message:
          "This stops the background watcher, removes the LaunchAgent, and deletes cached data. The Raycast extension will stop functioning until reinstalled.",
        primaryAction: { title: "Uninstall", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) {
        await closeMainWindow();
        return;
      }
      const result = await uninstall();
      if (result.failures.length === 0) {
        await showHUD("Daemon uninstalled — you can now remove the extension from Raycast");
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Uninstall completed with issues",
          message: result.failures.map((f) => `${f.path}: ${f.error}`).join("; "),
        });
      }
      await closeMainWindow();
    })();
  }, []);

  return <Detail markdown="### Removing the daemon…" />;
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. Run "Uninstall Daemon" in Raycast. Confirm the alert.
Verify:
- LaunchAgent: `launchctl print gui/$UID/com.ariestwn.lossless-switcher` returns non-zero.
- Files gone: `ls ~/Library/LaunchAgents/com.ariestwn.lossless-switcher.plist` → No such file.
- Support and cache dirs gone: `ls ~/Library/Application\ Support/com.ariestwn.lossless-switcher/` → No such file.

Re-run "Now Playing" — it should re-install the daemon cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/uninstall-daemon.tsx
git commit -m "feat: add Uninstall Daemon command"
```

---

## Phase 5 — Polish

### Task 19: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Lossless Switcher

> Bit-perfect Apple Music on macOS — detects the live audio format and auto-switches your DAC sample rate.

## What it does

Apple Music on macOS does not automatically reconfigure your output device's sample rate to match the source material. Play a 96 kHz hi-res master through a DAC stuck at 44.1 kHz and macOS silently downsamples it. Lossless becomes lossy.

This Raycast extension fixes that. A small background daemon tails the system log for `MediaToolbox` format reports from Music.app, parses the live codec / sample rate / bit depth, and re-configures the active output device via CoreAudio HAL to match — bit-perfect playback, automatically.

## Commands

| Command | Description |
|---|---|
| Now Playing | Currently-playing track + live format + actions |
| Switch Audio Format | Manual sample-rate / bit-depth picker |
| Toggle Auto-Follow | Enable / disable auto-switching |
| Lossless Status | Live sample rate in the menu bar |
| Uninstall Daemon | Remove the background watcher (run before removing the extension) |

## Permissions

On first run, macOS will prompt for **Automation → Music**. Click Allow. No other permissions needed.

## Removing the extension

**Run the `Uninstall Daemon` command first**, then remove the extension from Raycast. This stops the LaunchAgent and clears cached data. If you skip this step, the daemon will keep running until macOS restarts; you can clean up manually:

```bash
launchctl bootout "gui/$(id -u)/com.ariestwn.lossless-switcher" 2>/dev/null
rm -f ~/Library/LaunchAgents/com.ariestwn.lossless-switcher.plist
rm -rf ~/Library/Application\ Support/com.ariestwn.lossless-switcher
rm -rf ~/Library/Caches/com.ariestwn.lossless-switcher
```

## Migrating from the Alfred workflow

If you previously used [`alfred-apple-music-format`](https://github.com/ariestwn/alfred-apple-music-format), the extension's **Now Playing** view will detect it and show a "Cleanup Old Alfred Daemon" action. Run that first to avoid two daemons fighting over the format-apply path. Then remove the workflow from Alfred itself.

## Build from source

```bash
git clone <this-repo>
cd lossless-switcher
npm install
npm run build-binaries  # produces universal Swift binaries in assets/
npm run dev             # opens in Raycast
```

`npm run build-binaries` requires Xcode command-line tools (`xcode-select --install`).

## License

MIT
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

### Task 20: Final verification — bundle size + smoke test

**Files:** none (verification step)

- [ ] **Step 1: Build extension bundle**

Run: `npm run build`
Expected: completes without errors. Final dist contains compiled JS + assets.

- [ ] **Step 2: Check binary sizes**

Run:
```bash
ls -lh assets/lossless-watcher assets/audio_format
du -sh assets/
```

Expected: combined under 5 MB. If significantly larger, investigate.

- [ ] **Step 3: End-to-end manual test plan**

In Raycast, with Music.app playing a streaming track:

1. **Now Playing** shows track + "(ALAC)" or similar format + "🟢 Daemon running · auto-follow ON".
2. ⌘T → "Auto-follow OFF" HUD; status pill updates next refresh.
3. ⌘T → "Auto-follow ON" HUD; status pill updates.
4. ⌘C → format summary in clipboard.
5. **Switch Audio Format** lists DAC formats; selecting one applies and HUD confirms.
6. **Lossless Status** appears in menubar with correct sample rate.
7. ⌘⇧X → daemon stopped HUD; status pill turns 🔴.
8. ⌘⇧S → daemon started HUD; status pill turns 🟢.
9. Play a hi-res streaming track → DAC sample rate auto-updates within 1-2 seconds (verify in Audio MIDI Setup).
10. **Uninstall Daemon** → confirm dialog, click Uninstall → success HUD; verify all files gone.
11. Re-run **Now Playing** → daemon auto-reinstalls; back to step 1.

Document any deviations.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all unit tests pass. Add coverage check if desired: `npm test -- --coverage`.

- [ ] **Step 5: Commit any final polish**

```bash
# Only if changes were needed during verification
git add -A
git commit -m "chore: final polish from end-to-end test"
```

- [ ] **Step 6: Tag a milestone (optional)**

```bash
git tag v0.1.0
```

---

## Done

The extension is ready for `npm run publish` to submit to the Raycast Store, or for local distribution via `ray develop`.

**Implementation summary:**
- 5 commands wired to Raycast manifest
- Headless Swift daemon installed as LaunchAgent on first run
- Universal-binary build pipeline
- Old Alfred workflow detection + cleanup affordance
- Explicit Uninstall Daemon command
- 4 unit-tested lib modules (flags, audio-format, nowplaying, format-display)
- Manual test plan documented above
