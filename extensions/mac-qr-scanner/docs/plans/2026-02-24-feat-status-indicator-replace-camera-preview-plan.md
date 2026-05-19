---
title: "feat: Replace camera preview with status indicators"
type: feat
status: completed
date: 2026-02-24
---

# Replace Camera Preview with Status Indicators

## Overview

Remove the flickering live camera preview (base64 JPEG in markdown) and replace it with simple status indicators showing camera state. This improves the UX by eliminating visual flicker while still giving the user clear feedback about what's happening.

## Problem Statement

The current camera preview renders a base64-encoded JPEG frame in Raycast's Detail markdown view, updating every ~500ms. This causes visible flickering as the image swaps between frames, which is a poor user experience.

## Proposed Solution

Replace the camera preview with two states:

1. **Loading** — `🟠 Camera is loading…` (shown from launch until first frame arrives)
2. **Ready** — `🟢 Camera is ready` + instruction text (shown once first frame arrives from Swift binary)

The QR detection pipeline (jimp + jsQR) continues running in the background unchanged — only the visual output changes.

## Acceptance Criteria

- [x] No base64 image preview is shown during scanning
- [x] "Camera is loading" with orange indicator shown on launch (`src/scan-qr-code.tsx`)
- [x] "Camera is ready" with green indicator shown once first frame arrives (`src/scan-qr-code.tsx`)
- [x] Instruction "Simply hold the QR code in front of your camera." shown below ready status
- [x] QR detection still works — found/error/WiFi states unchanged
- [x] No visual flickering during scanning

## MVP

### Changes to `src/scan-qr-code.tsx`

**1. Remove `frameBase64` state and preview update logic**

Remove:
- `const [frameBase64, setFrameBase64] = useState<string>("")`
- The entire `updatePreview()` function and `previewTimer`/`lastPreviewUpdate`/`latestBase64` variables
- The `updatePreview(line)` call in the `rl.on("line")` handler
- The `frameBase64` parameter from `buildMarkdown` call

**2. Add `cameraReady` state**

```typescript
const [cameraReady, setCameraReady] = useState(false);
```

Set `setCameraReady(true)` on the first frame received in the `rl.on("line")` handler (alongside clearing the startup timer).

**3. Update `buildMarkdown` function**

Replace the `"scanning"` case:

```typescript
case "scanning":
  if (!cameraReady) {
    return `🟠 **Camera is loading…**`;
  }
  return `🟢 **Camera is ready**\n\nSimply hold the QR code in front of your camera.`;
```

Update the function signature to accept `cameraReady: boolean` instead of `frameBase64: string`.

**4. Update the startup timeout check**

The current timeout checks `!frameBase64` — change this to check `!cameraReady` (or just let the ref-based approach work since `setCameraReady` happens at the same point).

## Sources

- Current implementation: `src/scan-qr-code.tsx`
- Swift binary brainstorm: `docs/brainstorms/2026-02-23-swift-native-capture-brainstorm.md`
