# YAFW Changelog

## [Improve GIF conversion] - 2026-06-04

- Fix GIF conversion two-pass palette: the generated palette is now applied with `paletteuse`, producing noticeably better colors and less banding (previously the palette was generated and discarded, so output was effectively single-pass)
- Add GIF quality preference (1-100) controlling the number of palette colors
- Make GIF frame rate configurable via a preference (previously hardcoded to 30fps), defaulting to 15fps for smaller files
- Add GIF speed and loop (forever/once) preferences
- Use Lanczos scaling when resizing GIFs for sharper output

## [Add video trim command] - 2026-01-28

- Add new "Trim" command to trim videos by specifying start time and either end time or duration

## [Maintenance] - 2025-02-12

- Remove unused `bun.lockb` file

## [Fix special characters handling in selected file's name] - 2024-05-20

- Fixes #12439 : fix how `sanitizeFileName` method handles special characters
- Fixes #12440 : when running a command on a file, follow MacOS naming convention to compute the new file's name

## [Fix unwanted behavior when file format is uppercase] - 2024-05-06

Now attempting to compress .MP4, .MOV etc. files should work properly.

## [Support file names with special chars] - 2024-05-06

Files containing `'` would not work. That's fixed now.

## [Merge with Video/GIF modfication extension] - 2024-05-03

Previously it was a separate `Video/Gif modification` extension. Now its source code has been merged with YAFW.
This adds additional commands such as `Convert To`, `Optimize`, `Resize` and `Stabilize`.

## [Fix custom paths and add error logging] - 2024-04-30

Now custom paths should work properly. Also, added error logging to debug production issues.

## [Initial Version] - 2024-04-18

Welcome to Yet Another Ffmpeg Wrapper (YAFW)!
