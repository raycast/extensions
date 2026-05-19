---
title: "feat: Replace imagesnap with native Swift camera binary"
type: feat
status: active
date: 2026-02-23
origin: docs/brainstorms/2026-02-23-swift-native-capture-brainstorm.md
---

# Replace imagesnap with native Swift camera binary

## Overview

Replace the Homebrew `imagesnap` dependency with a native Swift binary that uses AVFoundation to capture webcam frames. This eliminates the only external dependency blocking Raycast Store distribution. The Swift binary runs as a long-lived process streaming base64 JPEG frames to stdout. The existing jimp + jsQR pipeline stays unchanged.

## Problem Statement

The extension requires `brew install imagesnap` before use. This makes it ineligible for the Raycast Store, where extensions must work without external dependencies. Additionally, imagesnap restarts the camera per frame, causing the camera light to blink.

## Proposed Solution

### Swift binary: `swift/CaptureFrame.swift` → `assets/capture-frame`

A single Swift file (~80 lines) compiled with `swiftc` into a universal binary (arm64 + x86_64).

**Behavior:**
- Opens an AVFoundation `AVCaptureSession` with `AVCaptureVideoDataOutput`
- Captures a frame every ~300ms via the delegate callback
- Encodes each frame as JPEG via ImageIO (`CGImageDestination`)
- Outputs one base64 line per frame to stdout (with `setbuf(stdout, nil)` for immediate flush)
- Camera stays on continuously (no blink)
- Runs until killed or stdin EOF (orphan protection)

**Communication protocol:**
- **stdout**: one base64-encoded JPEG per line
- **stderr**: human-readable error messages (e.g., `No camera found`, `Camera access denied`)
- **exit codes**: 0 = normal (killed by signal or stdin EOF), 1 = error
- **stdin EOF** = parent died → binary self-terminates (orphan protection)

**SIGTERM handling:**
- Install a signal handler that stops the `AVCaptureSession` and exits cleanly
- Ensures camera is released and indicator light turns off

**Camera session preset:** `.medium` (640x480) — good balance of QR detection quality vs. IPC overhead. Avoids sending 1080p frames (~150KB base64 each) through stdout.

### TypeScript changes: `src/scan-qr-code.tsx`

- Import `spawn` (instead of `execFile`), `createInterface` from `readline`, `environment` from `@raycast/api`
- `chmod` the binary before first spawn (Raycast packaging may strip executable bit)
- Spawn the binary, read stdout line-by-line via readline
- On each line: decode base64 → jimp → jsQR (same pipeline as today)
- Frame dropping: process frames sequentially; when one finishes, take the latest queued line, discard intermediate ones
- Kill the process (`SIGTERM`) on unmount or QR found
- Startup timeout: if no frame arrives within 5 seconds, show error
- Remove: `resolveImagesnap()`, temp file logic, `randomUUID` import, `warmupDelay` preference usage

### Build script

Add a `build-swift` npm script that compiles the universal binary:

```bash
swiftc swift/CaptureFrame.swift -O \
  -target arm64-apple-macosx12.0 \
  -framework AVFoundation -framework CoreMedia \
  -framework CoreVideo -framework CoreImage -framework ImageIO \
  -o assets/capture-frame-arm64

swiftc swift/CaptureFrame.swift -O \
  -target x86_64-apple-macosx12.0 \
  -framework AVFoundation -framework CoreMedia \
  -framework CoreVideo -framework CoreImage -framework ImageIO \
  -o assets/capture-frame-x86_64

lipo -create -output assets/capture-frame \
  assets/capture-frame-arm64 assets/capture-frame-x86_64

rm assets/capture-frame-arm64 assets/capture-frame-x86_64
```

Update `package.json`:
```json
"build": "npm run build-swift && ray build",
"dev": "npm run build-swift && ray develop"
```

The compiled binary is committed to git (like the `display-modes` Raycast extension). Swift source in `swift/` provides Store transparency.

### Preference cleanup

Remove the `warmupDelay` preference from `package.json` and the `Preferences` interface. AVFoundation handles exposure auto-adjustment; first usable frames appear within ~0.5s naturally.

## Acceptance Criteria

- [x] `swift/CaptureFrame.swift` — single-file Swift binary using AVFoundation
- [x] `assets/capture-frame` — universal binary (arm64 + x86_64), committed to git
- [x] Binary streams base64 JPEG lines to stdout at ~300ms intervals
- [x] Binary self-terminates on stdin EOF (orphan protection)
- [x] Binary handles SIGTERM gracefully (releases camera)
- [x] Binary writes errors to stderr and exits with code 1 on failure
- [x] `src/scan-qr-code.tsx` — uses spawn + readline instead of execFile
- [x] TypeScript `chmod`s binary before first spawn
- [x] 5-second startup timeout with error message if no frames arrive
- [x] Frame dropping prevents memory buildup when processing is slow
- [x] Camera light stays on continuously during scanning (no blink)
- [x] QR detection still works (jimp + jsQR pipeline unchanged)
- [x] WiFi connect and URL actions still work
- [x] `warmupDelay` preference removed from package.json
- [x] `npm run build` compiles Swift and bundles extension
- [x] Works on both Apple Silicon and Intel Macs

## Files to create/modify

| File | Action | Purpose |
|------|--------|---------|
| `swift/CaptureFrame.swift` | Create | Native camera capture binary source |
| `assets/capture-frame` | Create | Compiled universal binary |
| `src/scan-qr-code.tsx` | Modify | Replace execFile loop with spawn + readline |
| `package.json` | Modify | Add build-swift script, remove warmupDelay preference, update build/dev scripts |

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-02-23-swift-native-capture-brainstorm.md](../brainstorms/2026-02-23-swift-native-capture-brainstorm.md)
- **Raycast display-modes extension** (pre-compiled binary in assets pattern): [github.com/raycast/extensions/tree/main/extensions/display-modes](https://github.com/raycast/extensions/tree/main/extensions/display-modes)
- **Raycast environment.assetsPath**: [developers.raycast.com/api-reference/environment](https://developers.raycast.com/api-reference/environment)
- **Raycast Store binary policy**: [developers.raycast.com/basics/prepare-an-extension-for-store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- **AVCaptureVideoDataOutput docs**: [developer.apple.com/documentation/avfoundation/avcapturevideodataoutput](https://developer.apple.com/documentation/avfoundation/avcapturevideodataoutput)
- **Building universal macOS binaries**: [developer.apple.com/documentation/apple-silicon/building-a-universal-macos-binary](https://developer.apple.com/documentation/apple-silicon/building-a-universal-macos-binary)
