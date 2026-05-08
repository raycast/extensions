<div align="center">
  <h1>Media Converter</h1>
  <p>Convert any media file with just a few keystrokes</p>
</div>

## Features

- Convert videos, images, and audio files with a simple interface
- Support for all popular media formats
- **Video → Animated GIF** with quality palette generation
- **Trim** videos and audio via Start / End fields
- **Strip metadata** (EXIF, GPS, tags) for privacy — per-run toggle or a default preference
- **Custom output folder** — save converted files anywhere (per-run or as a preference)
- **Before/After size comparison** in the success toast (e.g. "saved 42 MB (58%)")
- **Live progress %** and ETA for video and GIF conversions
- **Conversion history** — browse, re-run, open, or copy the FFmpeg command for any past conversion
- **Presets** — built-in presets (Web WebP, Email MP4, Podcast MP3, Twitter GIF, …) plus save-your-own
- **Merge / concatenate** multiple video or audio files with automatic fast stream-copy or re-encode fallback
- Simple customization of the quality of the output file; precise control by enabling it in extension preferences
- Smart file naming to prevent conflicts
- Automatic FFmpeg installation and management
- Copy FFmpeg command to clipboard to inspect/learn/run it manually in terminal

## Supported Formats

| Media Type | Supported Input Formats                                                                                                                            | Supported Output Formats                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Video      | MOV, MP4, AVI, MKV, MPG, WEBM, TS, MPEG, VOB, M2TS, MTS, M4V, FLV, 3GP, ASF, WMV, RMVB, OGV, MXF, NUT, DV, GXF, RM, CDXL, WTV, M3U8, MPD, SEG, TXD | MP4, AVI, MKV, MOV, MPG, WEBM, **GIF**   |
| Image      | JPG, JPEG, PNG, WEBP, HEIC (MacOS), TIFF, TIF, AVIF, BMP, PCX, TGA, RAS, SGI, PPM, PGM, PBM, PNM, XBM, XPM, ICO, JP2, J2K, PCD, CIN, WBMP, XFACE   | JPG, PNG, WEBP, HEIC (MacOS), TIFF, AVIF |
| Audio      | MP3, AAC, WAV, M4A, FLAC, AIF, AIFF, OGG, OGA, ALAC, WMA, OPUS, AMR, CAF, AU, SND, APE, DSF, DFF, MPC, WV, SPX, XA, RA                             | MP3, AAC, WAV, FLAC, M4A                 |

## Usage

### Convert Media

1. Open Raycast and search for "Convert Media"
2. Select files to convert (⌘ + click for multiple) OR select files in Finder before opening the extension
3. (Optional) Pick a **Preset**, adjust **Trim**, toggle **Strip metadata**, or change the **Save to** folder
4. Choose your desired output format and quality settings (defaults are fine)
5. Press &#8984;↵ to start conversion
6. After conversion, a toast shows the size savings (e.g. "saved 42 MB (58%)"). Press &#8984;O to open the new file.

#### Converting video to GIF

Select any video file, pick `.gif` as the output format, then choose frame rate (10/15/24/30 fps), width, and whether the GIF should loop. The extension uses FFmpeg's `palettegen` + `paletteuse` pipeline for high-quality GIF output.

### Merge Media

1. Search for "Merge Media" in Raycast
2. Select 2+ video files OR 2+ audio files (all must be the same type)
3. Pick an output format and filename
4. Turn on "Always re-encode" if your inputs have different codecs/resolutions; otherwise the extension tries fast stream-copy first.

### View Conversion History

- Open "View Conversion History" to see your recent conversions grouped by day.
- For each entry: Open the file, show in Finder, re-run with the exact same settings (great after re-saving a source file), copy the FFmpeg command, or remove from history.

### Manage Presets

- "Manage Presets" lets you browse built-in presets (WebP 80, Podcast MP3, Twitter GIF, etc.) and create/edit/delete your own.
- Built-in presets can be duplicated to "My Presets" and then customized.
- From the Convert Media form, use "Save Settings as Preset…" (⌘S) to capture the current format, quality, trim, metadata and output folder as a reusable preset.

### Preferences

You can also set defaults in extension preferences:

- **Default Image Output Format**: default output format for image conversions.
- **Default JPG Quality**: default JPG quality (`0` to `100`, step `5`).
- **Default WEBP Quality**: default WEBP quality (`Lossless (when supported)` or `0` to `100`, step `5`).
- **Default PNG Variant**: default PNG variant (`PNG-24` or `PNG-8`).
- **Default HEIC Quality (macOS only)**: default HEIC quality (`0` to `100`, step `5`).
- **Default TIFF Compression**: default TIFF compression (`Deflate` or `LZW`).
- **Default AVIF Quality**: default AVIF quality (`0` to `100`, step `5`).
- **Default Audio Output Format**: default output format for audio conversions.
- **Default Audio Quality Preset**: preset used in simple mode (`lowest`, `low`, `medium`, `high`, `highest`).
- **Default Video Output Format**: default output format for video conversions.
- **Default Video Quality Preset**: preset used in simple mode (`lowest`, `low`, `medium`, `high`, `highest`).
- **Default GIF FPS**: default frame rate for video → GIF conversions (`10`, `15`, `24`, `30`).
- **Default GIF Width**: default output width for GIFs (`original`, `480`, `720`, `1080`).
- **Default Output Location**: `Same folder as input` or `Custom folder` (see next).
- **Custom Output Folder**: absolute path used when `Default Output Location` is set to `Custom folder`.
- **Strip Metadata By Default**: when on, converted files get `-map_metadata -1` applied so EXIF/GPS/tags are removed.

You can still override all values in the Convert Media form every time you run a conversion.

### ✨ Ask Media Converter

1. Get started by typing @ in Raycast AI
2. Example prompts:
   - Convert the last mp3 file in @finder downloads to wav
   - Convert all png files on my @finder desktop to webp
   - Convert my last screen recording in @finder downloads to webm
   - Convert the heic photos in @finder desktop to png
   - Turn my last video in @finder downloads into a 15fps 720px looping gif
   - Trim the first 3 seconds off my last mp4 and save to Desktop
   - Merge the three mp3s on my @finder desktop into one file called interview.mp3
   - Compress my last mp4 without metadata

### Advanced usage

#### Specify Local FFmpeg Path

Already have FFmpeg on your system but the extension didn't automatically detect it? Open the extension preferences and set the path to your FFmpeg executable.

#### More Conversion Settings (Advanced)

By default, audio and video formats will only propose 5 quality levels. Want more granular control, like encoding method, bitrate, bit depth, etc?
Open the extension preferences and turn on "More Conversion Settings (Advanced)".

### Requirements

- FFmpeg:
  - **RECOMMENDED:** If no FFmpeg is auto-detected, the extension will install a correct binary executable. That binary will only be available for the extension (not system-wide), and will be uninstalled when the extension is uninstalled. On MacOS, that weights about 45.6 MB.
  - If FFmpeg is already installed (and auto-detected) and is of version 6.0+, that will be used
  - If you have a 6.0+ FFmpeg binary executable but the extension didn't auto-detect it, you can specify the path to that binary on the Welcome page under actions, &#9881; Specify Local FFmpeg Path (Advanced)

### For Contributors

Image preference definitions are maintained in `src/config/image-preferences.json` and synced into `package.json`.

- Run `npm run generate:image-preferences` to write image preference entries into `package.json`.
- Run `npm run check:image-preferences` to verify `package.json` is in sync with `src/config/image-preferences.json`.

## License

MIT License

## Author

Created by [@leandro.maia](https://raycast.com/leandro.maia)
