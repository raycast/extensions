# ▶︎ YAFW

> Yet Another FFMPEG Wrapper.

Compress videos easily from [Raycast](https://raycast.com). Zero config. From your clipboard, or the Finder.

## Requirements

It *obviously* requires ffmpeg, but it does not come bundled with it. It will use the one from your system.

The easiest way to install ffmpeg is using [Homebrew](https://brew.sh/):

```bash
brew install ffmpeg
```

If it's not installed on a standard path, you can specify the path to ffmpeg in the extension settings.

## Crop Command

Use the `Crop` command to crop videos to a target aspect ratio without resizing.

- Choose a ratio in `Preset` (for example `16:9`, `9:16`, `4:3`), or
- Enter `Custom Width` and `Custom Height`.

If custom width and height are provided, they take priority over preset.

### Examples

- `Preset = 9:16` crops a landscape video to vertical.
- `Custom Width = 10`, `Custom Height = 9` crops to a 10:9 ratio.

### Notes

- Crop is a centered crop (`crop` filter), so edges are trimmed and content is not stretched.
- Output files are saved next to the source and named like `video (cropped 16x9).mp4`.
- If the target filename already exists, a numeric suffix is added.
- Cropping GIFs is not supported in this command.
