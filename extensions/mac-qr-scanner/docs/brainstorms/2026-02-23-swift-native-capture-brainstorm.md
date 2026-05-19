# Swift Native Camera Capture

**Date:** 2026-02-23
**Status:** Ready for planning

## What We're Building

Replace the `imagesnap` Homebrew dependency with a native Swift binary so the extension can be distributed on the Raycast Store with zero external dependencies. The Swift binary handles **camera capture only** — the existing jimp/jsqr pipeline stays for QR detection and preview encoding.

### Swift binary behavior
- Runs as a **long-lived process** (spawned once, killed when done)
- Keeps the AVFoundation camera session open continuously (no blink between frames)
- Captures a JPEG frame every ~300ms
- Outputs each frame as a **single line of base64** to stdout
- No warmup delay preference — AVFoundation handles exposure auto-adjustment; first usable frames appear naturally within ~0.5s

### TypeScript side changes
- Replace `execFile` loop with `spawn` + readline on stdout
- Read base64 lines as they arrive, feed into existing jimp → jsQR pipeline
- Kill the process on unmount or when QR found
- Remove the `warmupDelay` preference from package.json

## Why This Approach

- **Simplest path to Store compliance** — only the external binary dependency (imagesnap) blocks Store distribution; npm deps (jimp, jsqr) are auto-bundled
- **Minimal Swift code** — single file (~50-80 lines), compiled with `swiftc`, no Swift Package Manager or Raycast Swift Tools framework
- **Solves camera blink** — continuous capture session keeps camera on, unlike per-invocation imagesnap calls
- **YAGNI** — can always move QR detection to Swift (Vision framework) later if needed

## Key Decisions

1. **Scope: Capture only** — Swift binary just outputs JPEG frames. jimp + jsqr stay in JS.
2. **IPC: Base64 lines on stdout** — one base64-encoded JPEG per line. Simple to parse, no temp files.
3. **Capture mode: Continuous stream** — binary runs until killed, outputs a frame every ~300ms. Camera stays on.
4. **No framework** — standalone Swift file compiled with swiftc. No Raycast Swift Tools, no SPM.
5. **Drop warmup preference** — AVFoundation auto-adjusts exposure. Simplifies preferences.
6. **Binary in assets/** — compiled binary placed in `assets/`, Swift source in `swift/` for Store transparency.

## Open Questions

None — all key decisions resolved.
