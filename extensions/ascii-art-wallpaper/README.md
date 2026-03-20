# ASCII Art Wallpaper

Generate ASCII art wallpapers from masterpieces of the Metropolitan Museum of Art.

## Features

- **Search Artworks** — Browse and search the Met Museum collection, then generate an ASCII wallpaper from any artwork.
- **Auto ASCII Wallpaper** — Configure settings and apply a random ASCII wallpaper instantly.
- **Background Rotation** — Automatically changes your wallpaper every hour with a new random artwork.

## How It Works

The extension fetches artwork images from the Met Museum's public API, converts them to ASCII characters using brightness mapping, and renders the result as a full-screen wallpaper image using macOS native text rendering (via `sips` and a compiled Swift renderer).

## Requirements

- macOS (uses `sips` and `osascript` which are built-in on macOS)
- The Swift compiler (`swiftc`) must be available — included with Xcode or Xcode Command Line Tools

## Settings

| Setting    | Description                             |
| ---------- | --------------------------------------- |
| Color Mode | Monochrome or original artwork colors   |
| Background | Wallpaper background color              |
| Text Color | ASCII character color (monochrome mode) |
| Density    | Number of characters per row (100–400)  |

The wallpaper is rendered at 3840x2160 (4K) resolution by default.
