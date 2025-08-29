<div align="center">
  <h1>Media Converter</h1>
  <p>Convert any media file with just a few keystrokes</p>
</div>

## Features

- Convert videos, images, and audio files with a simple interface
- Support for all popular media formats
- Simple customization of the quality of the output file; precise control by enabling it in extension preferences
- Smart file naming to prevent conflicts
- Automatic FFmpeg installation and management

## Supported Formats

| Media Type | Supported Input Formats                                                                                                                            | Supported Output Formats                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Video      | MOV, MP4, AVI, MKV, MPG, WEBM, TS, MPEG, VOB, M2TS, MTS, M4V, FLV, 3GP, ASF, WMV, RMVB, OGV, MXF, NUT, DV, GXF, RM, CDXL, WTV, M3U8, MPD, SEG, TXD | MP4, AVI, MKV, MOV, MPG, WEBM            |
| Image      | JPG, JPEG, PNG, WEBP, HEIC (MacOS), TIFF, TIF, AVIF, BMP, PCX, TGA, RAS, SGI, PPM, PGM, PBM, PNM, XBM, XPM, ICO, JP2, J2K, PCD, CIN, WBMP, XFACE   | JPG, PNG, WEBP, HEIC (MacOS), TIFF, AVIF |
| Audio      | MP3, AAC, WAV, M4A, FLAC, AIF, AIFF, OGG, OGA, ALAC, WMA, OPUS, AMR, CAF, AU, SND, APE, DSF, DFF, MPC, WV, SPX, XA, RA                             | MP3, AAC, WAV, FLAC                      |

## Usage

### Convert Media

1. Open Raycast and search for "Convert Media"
2. Select files to convert (⌘ + click for multiple) OR select files in Finder before opening the extension
3. Choose your desired output format and quality settings (defaults are fine)
4. Press &#8984;↵ to start conversion

### ✨ Ask Media Converter

1. Get started by typing @ in Raycast AI
2. Example prompts:
   - Convert the last mp3 file in @finder downloads to wav
   - Convert all png files on my @finder desktop to webp
   - Convert my last screen recording in @finder downloads to webm
   - Convert the heic photos in @finder desktop to png

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

## License

MIT License

## Author

Created by [@leandro.maia](https://raycast.com/leandro.maia)
