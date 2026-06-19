# Cut Out

Cut Out removes a horizontal or vertical band from an image, then automatically stitches the remaining parts together.

I built this because I had this exact workflow years ago in a screenshot software named Snagit, and after switching tools I could not find a simple equivalent. If you ever needed to remove a middle section of a screenshot without manually rebuilding the image, this is for you.

## Requirements

- You must have `Xcode` installed, or at least `Xcode Command Line Tools (CLT)`.
- This extension compiles a Swift helper on first launch.
- Without Xcode/CLT available on your machine, the extension will not work.

## What You Can Do

- Remove unwanted rows or columns from an image in seconds
- Work from a Finder selection or directly from clipboard content
- Keep the result in a new file or overwrite the original
- Reveal or open the exported image right after processing

## Commands

### `Cut out Image Section from Selection`

Use the currently selected image in Finder.

### `Cut out Image Section from Clipboard`

Use the image currently stored in your clipboard, then copy the result back to clipboard.

## How to Use

1. Run one of the two commands.
2. In the Cut Out window, choose `Horizontal` (shortcut "h") or `Vertical` (shortcut "v").
3. Drag to select the strips you want to remove.
4. Press `Enter` to apply, or `Esc` to cancel.

## Preferences

- `Export Mode`
- `Create New File`: Save beside the source image with a `-cutout` suffix.
- `Overwrite Original`: Replace the source file.
- `Reveal output in Finder`: Open Finder and highlight the result.
- `Open output image`: Open the result in your default image app.

## Notes

- Works on `macOS`.
- Supports common image formats such as PNG, JPG/JPEG, GIF, TIFF, BMP, HEIC/HEIF, and WebP.
