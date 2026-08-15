# Metadata Screenshots – PR #24561 Feedback

The Raycast reviewer (@0xdhrv) requested that metadata screenshots (1.png, 2.png, etc.) use the **Raycast screenshot tool** so they match the store’s visual style.

## Why this matters

Current screenshots show the local extension logo/dev UI, which won’t appear in the published extension. Raycast’s tool produces consistent, store-ready screenshots.

## How to retake screenshots

1. **Configure Window Capture**
   - Raycast → Preferences → Advanced → Hotkey
   - Set a shortcut (e.g. `⌘⇧⌥+M`)

2. **Prepare the extension**
   - Open the extension in development mode (`npm run dev`)
   - Run each command you want to screenshot (Overview, Videos, Playlists, Transcripts)

3. **Take each screenshot**
   - Open the command you want to capture
   - Press the Window Capture hotkey
   - **Check “Save to Metadata”** so it goes to the metadata folder
   - Use a background with clear contrast (e.g. from [Raycast Wallpapers](https://www.raycast.com/wallpapers))

4. **Requirements**
   - Size: 2000 × 1250 pixels (landscape, 16:10)
   - Format: PNG
   - Use the **same background** for all screenshots
   - Do not show dev menus or local extension logos

## Docs reference

- [Raycast: Screenshots](https://developers.raycast.com/basics/prepare-an-extension-for-store#screenshots)
