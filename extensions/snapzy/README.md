# Snapzy for Raycast

Control [Snapzy](https://github.com/duongductrong/Snapzy) — the open-source macOS screenshot and recording app — from Raycast: trigger any capture or recording mode, browse your capture history, and manage cloud uploads.

## Requirements

- [Snapzy](https://github.com/duongductrong/Snapzy) 1.27.0 or later, installed.
- **Settings → General → Enable URL scheme** turned on in Snapzy (required for the launcher commands).

## Commands

**Launchers** (no-view; each fires a `snapzy://` deep link after closing the Raycast window so it isn't in the shot):

| Command | Deep link |
|---|---|
| Capture Fullscreen | `snapzy://capture/fullscreen` |
| Capture Area | `snapzy://capture/area` |
| Capture Window | `snapzy://capture/application` |
| Capture Active Window | `snapzy://capture/active-window` |
| Capture Area and Annotate | `snapzy://capture/area-annotate` |
| Capture Scrolling Window | `snapzy://capture/scrolling` |
| Capture Text (OCR) | `snapzy://capture/ocr` |
| Capture Smart Element (off by default) | `snapzy://capture/smart-element` |
| Capture Object Cutout | `snapzy://capture/object-cutout` |
| Record Screen | `snapzy://record/screen` |
| Record Window | `snapzy://record/application` |
| Open Annotator | `snapzy://open/annotate` |
| Open Video Editor | `snapzy://open/video-editor` |
| Toggle History Overlay | `snapzy://open/history` |
| Toggle Cloud Uploads Window (off by default) | `snapzy://open/cloud-uploads` |
| Open Settings (tab dropdown) | `snapzy://settings?tab=…` |
| Toggle Shortcuts Overlay (off by default) | `snapzy://show/shortcuts` |
| Combine Selected Images | `snapzy://open/combine?file=…&file=…` from the Finder selection (needs ≥2 images) |

Route list sourced from `Snapzy/App/SnapzyDeepLinkHandler.swift` (Snapzy 1.27.0). Deep links require **Settings → General → Enable URL scheme** in Snapzy. If Snapzy isn't running, the first deep link launches it.

**Views** (read Snapzy's SQLite DB at `~/Library/Application Support/Snapzy/snapzy.db`):

- **Capture History** — grid of screenshots/recordings (newest first, type filter). Actions: copy image file, paste to frontmost app, open, show in Finder, copy path.
- **Cloud Uploads** — list of uploads; copy or open the public URL.

## Development

```sh
npm install
npm run dev      # ray develop: builds, imports into Raycast, hot reloads
npm run build
npm run lint
npm run publish  # opens a PR against raycast/extensions
```
