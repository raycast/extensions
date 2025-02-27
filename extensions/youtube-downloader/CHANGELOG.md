# Video Downloader Changelog

## [Improvements & Fixes] - 2025-02-21

- Use `execa` instead of `nano-spawn` for advanced usages
- Fix Homebrew installer & use more friendly toasts with actions for downloader & Homebrew installer
- Add some troubleshooting tips to preference descriptions
- Update extension description to cover more users
- Bump all dependencies to the latest

## [Improvement] - 2025-02-21

- Add an experimental preference option for forcing IPv4 to solve some network issues
- Add a message to remind users not to close the current window while installing homebrew packages

## [Enhancements] - 2025-02-17

- Unlock its full ability from all sites
- Move the warning message to the form description
- Only show download failed message on errors
- Fix live video condition
- Add a link accessory to the form view to show the supported sites
- Mention the `yt-dlp` in readme
- Mention supported sites in readme
- Comment `Can I download clips from YouTube` out since we don't support it yet
- Update screenshots since the format selector is not ready yet

## [Improvement] - 2025-02-15

- Add a preference option for toggling read URL from clipboard support
- Add a preference option for toggling read URL from selected text support

## [Fixes] - 2025-02-12

- Add a preference option for toggling Browser Extension support

## [Improve Error Message] - 2025-02-04

- Improve error message
- Fix URL validator while link has no protocol prefix
- Replace `execa` with `nano-spawn`
- Adjust import orders
- Fix `yt-dlp` from preferences

## [Fixes] - 2025-02-03

- Fixed error: Unable to get selected text from frontmost application

## [Insert active tab URL] - 2025-02-02

- If the raycast browser extension is installed, the extension will automatically insert the active tab URL into the input field

## [Improve URL Validator] - 2025-01-23

- Improve `isYouTubeURL` function
- Bump all dependencies to the latest

## [Simplify Extension] - 2025-01-22

- Simplified the extension by focusing on core functionality and relying on the `yt-dlp` executable instead of fork libraries which give so many issues.

## [Enhancement] - 2024-11-25

- Update README with FAQs

## [Fixed bug #15306] - 2024-11-11

- Fixed the highest quality bug

## [Add WAV support] - 2024-10-21

- Added WAV support for audio downloads

## [Remove empty dropdown items] - 2024-08-29

- Removed empty dropdown items from the format selection to improve user experience
- Added mp3 keyword for audio options

## [Update package dependency] - 2024-08-12

- Update the `@dustube/ytdl-core` dependency to resolve the video download failure issue.

## [Fix video not found] - 2024-08-01

- Update the `@dustube/ytdl-core` dependency to fix the video not found issue

## [Fix Live Premiere video download] - 2024-07-30

- Fix the live premiere video download issue

## [Fix download failed] - 2024-07-16

- Replace the `ytdl-core` with `@distube/ytdl-core` to fix the download failed issue

## [Update copy the video or audio file name with the video title] - 2024-07-05

- Update copy the video or audio file name with the video title
- Fix the key rendering problem in the format dropdown

## [Fix FFmpeg v7 error] - 2024-05-26

## [Update FFmpeg installation docs] - 2024-04-17

## [Error handling for livestreams] - 2023-10-28

- Show unsupported error message for livestreams links

## [Better error handling] - 2023-10-28

## [Add trimming support] - 2023-09-03

- Added optional `Start Time` and `End Time` fields to trim the output video

## [Sanitizing file name] - 2023-08-08

## [Added new format] - 2023-08-05

- Updated ytdl-core dependency from ^4.11.4 to ^4.11.5
- Added an option to enable .webm for higher quality downloads

## [Custom `ffmpeg` path] - 2023-07-08

- Added a preference so users can configure the `ffmpeg` executable path

## [Added metadata images] - 2023-06-19

- Added metadata images
- Updated dependencies

## [Initial Version] - 2023-03-28
