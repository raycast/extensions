# Fast Image

Quickly search and paste images from your own local library, without leaving the keyboard.

Point the extension at a folder — Fast Image scans it (and every subfolder) for images, and lets you browse them all as a grid. Hit `Enter` to paste the selected image straight into whatever app you were just typing in, or `Ctrl+Enter` to copy it to the clipboard instead.

Maintain a library of diagrams, logos, or your favorite memes, and drop them into work chats in seconds.

## Features

- **Recursive folder scanning** — images anywhere inside the chosen folder are picked up automatically.
- **Broad format support** — PNG, JPG, JPEG, GIF, WEBP, SVG, BMP, ICO, AVIF, and PDF (shown as a page preview).
- **Paste or copy** — paste directly into the previously focused app, or copy to the clipboard for later.
- **Sorting** — by name (A–Z or Z–A), date added, date modified, file size (each newest/oldest or largest/smallest first), most recently used, or most frequently used. Your choice is remembered.
- **Thumbnail fit** — choose whether thumbnails show the full image (letterboxed) or fill their grid cell (cropped, no distortion).
- **Auto refresh** — automatically rescan the folder never, every hour, every day, or every time the extension opens; you can always refresh manually too.

## Setup

Open the extension preferences to configure:

- **Images Folder** — the folder to scan (required). Change it at any time.
- **Thumbnail Fit** — fill grid cells instead of showing the full image.
- **Auto Refresh** — how often the image list rescans itself automatically.

## Notes

- Animated GIFs are shown as a static preview — Raycast's grid does not play GIF animation.
- Folder scanning skips symbolic links to avoid infinite loops.
