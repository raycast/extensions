# Image Hash Rename

Rename every image in a folder by appending an 8-character MD5 content hash to its filename.

**Before:** `photo.jpg`  
**After:** `photo.e31b377b.jpg`

## Features

- Renames images to `[name].[hash8].[ext]` format
- Hash is derived from **file content** — same file always gets the same hash
- **Idempotent** — already-hashed files are skipped automatically
- Supports: JPG, JPEG, PNG, GIF, WebP, SVG, BMP, TIFF, ICO, AVIF

## Usage

1. Open Raycast and run **"Add Hash to Images"**
2. On first run, set the **Image Folder** in Preferences (`⌘ ,`)
3. The command runs silently and shows a HUD on completion

## Preferences

| Name | Description | Required |
|------|-------------|----------|
| Image Folder | The folder containing images to rename | ✅ |
