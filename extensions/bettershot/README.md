# BetterShot for Raycast

Seven Raycast commands for the [BetterShot macOS app](https://github.com/KartikLabhshetwar/better-shot), using its documented [URL scheme](https://github.com/KartikLabhshetwar/better-shot#automate-captures).

## Requirements

Install [BetterShot](https://github.com/KartikLabhshetwar/better-shot/releases) and open it once before using these commands. Current BetterShot releases require macOS 26 or later. Allow BetterShot to capture your screen when prompted.

## Usage

Search Raycast for **BetterShot** and select a command. Capture Region and Capture Window ask you to select what to capture. Open Recording Options opens BetterShot's recording controls so you can choose a source and start recording.

For a hotkey, open Raycast Settings → Extensions → BetterShot and assign one to a command.

## Commands

| Command | BetterShot URL |
| --- | --- |
| Capture Region | `bettershot://capture/region` |
| Capture Fullscreen | `bettershot://capture/fullscreen` |
| Capture Window | `bettershot://capture/window` |
| Scan Text (OCR) | `bettershot://ocr` |
| Pick Color | `bettershot://color-picker` |
| Open Recording Options | `bettershot://record` |
| Open Settings | `bettershot://settings` |

Every command waits for Raycast's main window to close before opening its URL. There is no success overlay to appear in your capture. Recording options let you choose the source and start recording in BetterShot; this extension does not provide recording stop/pause controls.

The extension does not read captures, upload files, change your clipboard, or require credentials. BetterShot handles captures and any clipboard behavior. Opening a URL confirms dispatch only; the URL scheme does not report whether you completed or cancelled a capture.

## Troubleshooting

- **Could not open BetterShot:** Install BetterShot in Applications and open it once so macOS registers its URL scheme.
- **No capture appears:** Open BetterShot directly and check its screen capture permissions. An older BetterShot version may not implement every documented action.
- **Test the integration:** Run `open 'bettershot://settings'` in Terminal. If settings do not open, update or repair BetterShot before testing Raycast.

## Development

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run lint
```

Tests cover all seven command-to-URL mappings, awaiting window closure, and launch failures. They mock the Raycast API; final capture testing must happen inside Raycast.

Built against `@raycast/api` 2.2.1 (pinned for compatibility with released Raycast clients) using the [Raycast API documentation](https://developers.raycast.com). Dependencies are pinned by `package-lock.json`. `npm run build` writes bundles into `dist/`; import the extension folder, not an individual bundle.

This is an independent integration, not an official BetterShot extension. The Raycast author is `andyli_lfs898`. The official BetterShot app icon is included with upstream attribution in `THIRD_PARTY_NOTICES.md`; the extension code is MIT-licensed.
