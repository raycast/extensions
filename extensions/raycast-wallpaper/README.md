## Raycast Wallpaper

Set Raycast official wallpapers as desktop wallpaper.

**Tips:**

- If you don't like the automatic wallpaper switching feature, turn it off by turning off the Background Refresh function in the command's preferences

## Windows

HEIC wallpapers are converted to full-resolution PNGs before setting or downloading them. The first use takes a few seconds; subsequent uses reuse the converted image. macOS keeps the original HEIC files.

## Downloads and cache

Downloads go to the configured Wallpaper Directory, or your Downloads folder when unset. Missing folders are created automatically. Full-size wallpapers are cached when you set or download them. Clear Picture Cache removes these cached images, leaving downloaded wallpapers in place.

## Development

Run `npm test`, `npx tsc --noEmit`, `npm run build`, and `npm run lint`. The Raycast build generates the preference and Rust type declarations required by TypeScript.

On Windows, check both a HEIC wallpaper such as Glaze 1 and a PNG wallpaper, with Current Monitor and All Monitors. Also test Download Wallpaper, Open Wallpaper Folder with no directory configured, and Auto Switch with Windows dark mode enabled.
