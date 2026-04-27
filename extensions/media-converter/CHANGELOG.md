# Media Converter Changelog

## [1.6.0] - 2026-04-27

### Added

- New command **Merge Media** to concatenate multiple video or audio files into a single file. Automatically uses fast FFmpeg stream-copy when all inputs share codec/resolution/fps/sample-rate; falls back to a full re-encode via the concat filter otherwise. A "Force re-encode" toggle is available.
- New command **View Conversion History** showing your recent conversions grouped by day, with actions: Open file, Show in Finder, Re-run with same settings, Copy FFmpeg command, Remove, Clear all.
- New command **Manage Presets** for browsing/creating/editing/deleting conversion presets. Ships with curated built-in presets: Web Image (WebP 80), Web Image (JPG 80), Email-friendly Video (MP4), WhatsApp Video (MP4), Podcast (MP3 192 VBR), Lossless Audio (FLAC), Twitter/X GIF, Voice Memo (M4A 96k).
- In the Convert Media form:
  - **Preset** dropdown (built-in + user presets filtered to the current file type) with a "Save Settings as Preset…" action (⌘S) that captures the current form state.
  - **Trim** fields (Start / End) accepting `HH:MM:SS[.mmm]` or bare seconds, with validation and live preview of the resulting duration.
  - **Save to** dropdown: same folder as input (default), preferences custom folder, or a per-run override folder.
  - **Strip metadata** checkbox that wires `-map_metadata -1` through for video/audio/image (and a best-effort strip for HEIC via `sips`).
  - Live progress percentage and ETA in the toast while converting videos or GIFs.
  - Success toast now reports size savings, e.g. "saved 42.3 MB (58%)".
- **Video → GIF** output. Select `.gif` when converting a video and choose fps, width, and loop behaviour. Uses FFmpeg's `palettegen` + `paletteuse` pipeline for clean, low-size GIFs.
- New AI tool **Merge Media** (`merge-media`) and extended `convert-media` tool with `outputDir`, `stripMetadata`, `trimStart`, `trimEnd`, `presetId`, `gifFps`, `gifWidth`, `gifLoop` parameters.
- New extension preferences:
  - `Default GIF FPS`
  - `Default GIF Width`
  - `Default Output Location` (`Same folder as input` / `Custom folder`)
  - `Custom Output Folder`
  - `Strip Metadata By Default`

### API Changes

- `convertMedia` now takes an options bag as its fourth argument (`{ returnCommandString?, outputDir?, stripMetadata?, trim?, onProgress? }`) instead of a boolean. The simple 3-argument form still works with the same defaults.
- Added `src/utils/ffmpegRun.ts` with `runFFmpegWithProgress` (spawns FFmpeg and streams `-progress pipe:1` updates back) and `probeDurationSec` (parses `ffmpeg -i` stderr).
- Added `src/utils/convertBatch.ts` — shared batch orchestrator that owns history logging, size tracking, progress reporting, and the success summary toast. Consumed by both the Convert Media form and future programmatic callers.
- Added `src/utils/history.ts`, `src/utils/presets.ts`, `src/utils/merge.ts`, `src/utils/time.ts`, `src/utils/format.ts`.
- Extended `types/media.ts` with `GifQuality`, `TrimOptions`, `Preset`, `OutputGifExtension`, `OutputCategory`, and `getOutputCategory()`.
- Built-in presets live in `src/config/built-in-presets.json`.

### Fixed

- **Audio-only merges** via the concat filter failed with `Stream specifier ':v:0' matches no streams` because the filter graph always requested a video stream, even for WAV/MP3/FLAC inputs. The re-encode merge now emits an audio-only filter graph when the output format is audio.

### Tests

- Added unit tests (Node's built-in test runner via `tsx`) covering time parsing, byte/size formatting, FFmpeg stdout/stderr parsers, merge stream-info helpers, media type helpers, and built-in preset validation.
- Added `npm run test:smoke` — generates tiny fixtures with FFmpeg itself and exercises `convertMedia`/`mergeMedia` end-to-end (webm, GIF, trim, strip-metadata, stream-copy merge, re-encode merge, audio merge, progress callbacks).
- Added `TESTING.md` with the manual UI checklist for every command.
- Extended `ai.evals` with cases covering GIF parameters, trim, strip-metadata, audio merge, video merge, and the `forceReencode` flag.

## [1.5.4] - 2026-03-05

### Added

- New extension preferences:
  - `Default Image Output Format`
  - `Default JPG Quality`
  - `Default WEBP Quality`
  - `Default PNG Variant`
  - `Default HEIC Quality (macOS only)`
  - `Default TIFF Compression`
  - `Default AVIF Quality`
  - `Default Audio Output Format`
  - `Default Audio Quality Preset (Simple Mode)`
  - `Default Video Output Format`
  - `Default Video Quality Preset (Simple Mode)`

### Fixed

- In simple mode, video quality now stays aligned with the selected simple quality level when changing output format (instead of resetting to the default level).
- Non-macOS image default output format now safely falls back from `.heic` to `.jpg` to avoid invalid dropdown states.
- Image default quality now reads directly from per-format preferences instead of cross-format mapping heuristics.

### API Changes

- Added `src/config/image-preferences.json` as the single source of truth for image preference metadata and value domains.
- Added `scripts/generate-image-preferences.mjs` to generate/check image preferences in `package.json`.
- Refactored `getDefaultImageQuality()` to resolve defaults by output format (`.jpg`, `.webp`, `.png`, `.heic`, `.tiff`, `.avif`) and validate configured values against shared domains.

## [1.5.3] - 2026-02-25

### Added

- New extension preferences:
  - `Default Image Output Format`
  - `Default Image Quality`
  - `Default Video Output Format`
  - `Default Video Quality Preset (Simple Mode)`
- `Default Image Quality` now supports detailed values (`Lossless (when supported)`, `100` to `0`, `PNG-24`, `PNG-8`, `TIFF Deflate`, `TIFF LZW`) to better match the in-form quality choices.

### Fixed

- In simple mode, video quality now stays aligned with the selected simple quality level when changing output format (instead of resetting to the default level).
- Non-macOS image default output format now safely falls back from `.heic` to `.jpg` to avoid invalid dropdown states.
- Format-specific image quality values now fall back to each format's `DEFAULT_QUALITIES` when the selected value is not applicable to the current output format.

### API Changes

- Added centralized image preference parsing in `getDefaultImageQuality()` to map preference values into format-specific quality settings while preserving legacy preset compatibility (`lowest` to `highest`).

## [1.5.2] - 2025-10-31

### Added

- `Copy FFmpeg Command` action in the Converter Form, to allow the user to inspect the command or run it by themselves in terminal.

### Fixed

- CRF option removed from AVI as it is not actually available
- Applied `-pix_fmt yuv420p` to all videos except `.mov` to broaden support when converting from specific/unsupported video codecs

### API Changes

- Simplified/centralized a `buildVideoQuality` factory for the AI tool
  - Tidied up some logic in `convert-media.ts` (the AI tool)
- Tidied up some unused exports (some were left because they will definitely come in handy in future updates)

## [1.5.1] - 2025-08-25

### Fixed

- Simple quality not being properly applied

## [1.5.0] - 2025-08-12

### Added

- Video conversion quality settings
- "More Conversion Settings (Advanced)": by default, video and audio will only show "lowest", "low", "medium", "high" and "highest" quality settings. By enabling "More Conversion Settings (Advanced)" in the extension preferences, the user will be shown a more fully-featured quality settings page, including CRF/VBR/VBR-2-PASS encoding mode, bitrate and more for video; bitrate, sample rate, bit depth, and more for audio
- Added lots more of supported formats as inputs

### API Changes

- New type system for centralized values

## [1.4.2] - 2025-06-27

### Added

- Specify custom FFmpeg path from the Raycast app's extension preferences (optional)

### Removed

- FFmpegInstallPage.tsx: a page for specifying a custom FFmpeg path. Replaced by the proper handling of user preferences.

### API Changes

- Re-flowed the lost FFmpeg handling to HelloPage.tsx, previously at FFmpegInstallPage.tsx

## [1.4.1] - 2025-06-26

Publish on windows

## [1.4.0] - 2025-06-25

Major rework of the installation of FFmpeg (way more streamline for non-brew users), future-proof (for when Raycast will support more platforms than MacOS)

### Added

- New auto-installation of FFmpeg (extension dependency)
- Auto-detect and auto-use of system FFmpeg if found on system and version 6.0+
- Possibility to give the extension a custom path to a FFmpeg 6.0+ binary executable (on the Welcome page, under actions, &#9881; Specify Local FFmpeg Path (Advanced))
- Icons for all actions

### Removed

- The previous 'NotInstalled.tsx' page, where the user would be guided to install FFmpeg via Homebrew. This has been replaced by the auto-detection or auto-installation
- Converting to .HEIC is now only possible on MacOS (not an issue since at the time of writing, Raycast is MacOS only). This is because HEIC is patent-encumbered and MacOS is the only OS (that we know of) that has a built-in utility containing libvips compiled with support for libheif, libde265 and x265

### API Changes

- Custom FFmpeg installation to environment.supportPath using a customised version of the [ffmpeg-static npm package](https://www.npmjs.com/package/ffmpeg-static)
- Added more categories to the extension

## [1.3.0] - 2025-05-27

### Added

- Support for .jpeg, .tif, .bmp files as input (not to be mistaken with .jpg and .tiff which were already supported)
- Quality options for all image formats

### Removed

- Quick Convert
  - Now replaced by the main "Convert Media" command
  - Since Convert Media now auto-selects the selected Finder files, no need for the Quick Convert action anymore
  - The main "Convert Media" command is just as fast as was "Quick Convert". If you don't know what quality setting to choose, defaults are good.

### Fixed

- Converting from and to .heic now works from and to any formats.

### API Changes

- Rewrote nearly the whole extension
  - Centralised convert-media.ts tool
  - Centralised types in converter.ts
  - Rewrote the file handling logic in ConverterForm.tsx
  - Added quality handling logic for images
  - Many more. See pull request for more info.

## [Enhanced README and added new metadata images] - 2025-03-10

## [✨ AI Enhancements] - 2025-02-21

## [1.2.0] - 2024-12-27

### Added

- Added support for AVIF file format conversion.
- Added support for multiple file selection in Quick Convert command.

## [1.1.0] - 2024-12-24

### Added

- Add support for webm file format conversion

## [1.0.1] - 2024-12-13

### Fixed

- Fix HEIC file format conversion not working as expected.

### Changed

- Refactor image conversion to use the sips command.

## [1.0.0] - 2024-12-11

### Added

- Added support for HEIC file format conversion using the sips command.
- Fixed a bug where the Convert Media command would not work as expected.

## [0.2.0] - 2024-12-10

### Added

- Added a new **Quick Convert** command that allows users to select a file in Finder, choose the desired format from a list, and convert it instantly.
- Integrated Finder selection for seamless file conversion:
  - Automatically detects and pre-selects media files currently highlighted in Finder.
  - Supports batch processing for multiple files
  - Retains manual file selection as a fallback.

## [0.1.1] - 2024-11-15

### Changed

- Added improvements to the ffmpeg installation check.

## [0.1.0] - 2024-11-15

### Initial Release
