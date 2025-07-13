# FFmpeg Changelog

## [✨ AI Enhancements] - 2025-02-21

## [Added conversion option and percentage progress] - 2023-10-17

- I added a new video file conversion option, called VideoLoop Converter. This uses FFMPEG to create a h.264 .mp4 file without sound, at a bitrate of 4000kbps. This is intended to be used as a replacement for GIFs on certain websites.
- Changed the progress view so that the feedback is in percentage, rather than a float between 0 and 1.
- Fixed an issue that prevented processing (rotation/conversion) of files that has spaces in the path.
- Changed version number to 1.1.0, from 1.0.0

## [Add support for MKV files] - 2023-09-09

- Improve ffprobe command to support MKV files.
- Cleanup ffprobe output processing logic.
- Add more error handling for video file information retrieval.

## [Initial Version] - 2023-09-03

-  Add basic video file information retrieval functionality.
-  Add capability to display video preview images.
-  Add functionality to copy file information to the clipboard.
-  Add enhanced file type filtering accuracy by searching audio and video streams.
