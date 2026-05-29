# The Downloader Changelog

## [Release Readiness] - {PR_MERGE_DATE}

- **Transcript extraction overhauled.** It now uses the same robust yt-dlp metadata path as the rest of the extension — fixing a crash on yt-dlp debug/warning output, passing the Deno JS runtime (without which YouTube transcript extraction silently failed), and running through the hang-prevention watchdog (closed stdin + idle-kill). The Download form's transcript action gained a **Stop** button and is cancelled on dismiss, subtitle language matching now catches regional/auto variants (`en-US`, `en-GB`, `en-orig`), playlist URLs no longer pull every entry's subtitles, and an empty transcript reports a clear failure instead of saving a blank file.
- **Filenames are sanitized on every platform.** Path separators (`/`, `\`) and leading dots are stripped from titles everywhere — previously a title like "AC/DC" broke transcript saving on macOS and a crafted title could write outside the chosen folder.
- **Spotify audio-format dropdown now works.** Choosing a format (including FLAC) is applied to the download instead of being silently ignored.
- **spotDL / Rosetta on Apple Silicon.** The extension now checks for Rosetta 2 before downloading the x86_64 spotDL binary, so a Mac without Rosetta no longer ends up with a binary that looks installed but fails every download with "Bad CPU type"; the friendly install hint is shown instead.
- **spotDL download integrity.** The auto-downloaded spotDL binary is now verified against the SHA-256 GitHub publishes for the release, the download host is pinned to GitHub, and partial downloads are cleaned up on failure.
- **Fewer stuck/leaked processes.** The Download form's metadata fetch and the Download Video AI tool now time out and are cancellable, so a wedged yt-dlp no longer hangs or leaks child processes.
- **gallery-dl counts are accurate.** Already-present (skipped) files are no longer counted as downloaded, and a run that fetches nothing new reports that honestly instead of a green "0 files".
- **Out-of-box download folder.** A leading `~` in the Download Folder preference (the `~/Downloads` default) is expanded, so first-run downloads land in the right place.
- Earlier store-prep work now recorded: `--no-playlist` on the Download Video AI tool (a playlist URL no longer dumps every video), Windows binary detection rework + centralized platform paths, new icon, refreshed screenshots, and Media + Productivity categories.

## [Fix: Hang Prevention] - 2026-05-21

- yt-dlp, gallery-dl, and monolith now run with the same hang-prevention spotDL already had: stdin is closed (so the child cannot block on an interactive 2FA / cookie-passphrase / login prompt) and an idle watchdog kills the child when no output arrives for a configurable window. Extracted the pattern into a shared `runWithWatchdog` helper in `src/lib/run.ts`.
- Added a **Network: Idle Timeout** preference (seconds, default 120). All four runners read it through the same code path. Raise it on very slow networks; lower it to surface stalls faster.
- **Transcript scratch directory** moved out of the user's download folder. It now lives under Raycast's support path with a per-call UUID subdirectory, so two concurrent transcript extractions can no longer step on each other (one's `rmSync` deleting the dir while the other reads from it), and a read-only or slow-mounted download folder no longer breaks transcript extraction.
- **Concurrent-submit guard** on the Download form: a second submit while a download is already running now shows a clear "A download is already running" toast instead of firing a second runner that races the first for the same output filename.
- **URL scheme allowlist**: `isValidUrl` now restricts to `http`/`https`. `javascript:`, `file:`, `data:`, and `ftp:` URLs are rejected up front, preventing the downstream tools from receiving inputs they were never meant to handle (yt-dlp's generic extractor on a `file:` URL, etc.). Protocol-less inputs like `youtube.com/watch?v=…` still work — they're prefixed with `https://` at the use site.
- **yt-dlp filepath extraction** now uses a sentinel tag (`THE-DOWNLOADER-FILEPATH:…`) on the `after_move` print line. Previously the runner picked up the last stdout line that started with `/`, which could be an intermediate `[ExtractAudio] Destination: …` from a post-processor — so "Open File" sometimes opened the intermediate file (or nothing) instead of the final output. The tagged line is unambiguous.
- **`fetchVideoInfo` is resilient to debug/warning lines** before the JSON. `--no-warnings --quiet` are passed to yt-dlp to keep stdout clean, and the JSON parser scans for the first line that starts with `{` instead of blindly `JSON.parse`-ing stdout. The Download form no longer goes silently blank when yt-dlp prints a debug header.
- **Updater surfaces per-package failures** instead of hiding them. Individual version-check failures show "(check failed: …)" next to the affected row, and per-package upgrade failures appear in an "Upgrade Issues" section of the markdown plus a Copy Upgrade Issues action. Previously winget failures and spotDL upgrade failures were silently swallowed and the row showed "up to date" even when nothing upgraded.
- **Stop action + unmount cleanup**. Every download toast now exposes a **Stop** secondary action that cancels the in-flight child. Dismissing the Download form mid-download (Escape/back) also kills the running child via an AbortController in `useEffect` cleanup — no more zombie yt-dlp / gallery-dl / monolith / spotDL processes when the user navigates away. Cancelled downloads show a neutral "Cancelled" toast rather than a red error.

## [Fix: macOS Stability] - 2026-05-21

- **Binary resolution** now searches a list of well-known macOS install locations — Apple Silicon Homebrew, Intel Homebrew, MacPorts, pipx user (`~/.local/bin`), Cargo (`~/.cargo/bin`), pyenv shims, and the inherited `PATH` — instead of assuming `/opt/homebrew/bin`. Intel Macs and pipx/Cargo installs of yt-dlp, gallery-dl, spotDL, and monolith are detected without the user setting per-tool path preferences.
- **Homebrew path** auto-detects when the configured preference doesn't exist on disk, so an Intel Mac with the Apple-Silicon default no longer fails with "Cannot find Homebrew".
- **Per-tool installs**: the installer now installs just the missing formula instead of all five Homebrew tools at once — faster, and one tool's install failure no longer blocks the others.
- **Per-tool upgrades**: the updater now upgrades each Homebrew formula individually, so one formula failure no longer aborts the rest.
- **spotDL — stale OAuth token invalidation**: when Spotify Client ID/Secret or the user-auth toggle changes, the extension now deletes spotDL's cached token at `~/.spotdl/.spotipy` (and the `~/.config/spotdl/` alternate path) so new credentials are actually used. Fixes spotDL upstream #2606, where credential changes were silently ignored.
- **spotDL — Rosetta 2 detection on Apple Silicon**: the prebuilt `spotdl-darwin` binary is x86_64-only. The Installer now detects a missing Rosetta runtime after download and surfaces the `softwareupdate --install-rosetta` command; runtime errors like "bad CPU type in executable" are also recognized and translated to the same hint instead of showing a raw shell error.
- **spotDL — Install via Homebrew**: added a second install action on the spotDL setup screen on macOS that runs `brew install spotdl`. Lets users opt into the Python-based formula (native on Apple Silicon, no Rosetta) instead of the prebuilt binary. Binary resolver picks up either install path automatically.

## [Feat: Redesigned Download Form] - 2026-05-19

- Rebuilt the **Download** command around a single adaptive form: paste a URL, pick a **Filetype** — Video, Audio, Image, Transcript, or Website — and the form shows just the options that filetype needs. The filetype is auto-detected and overridable, so a misdetected URL is one click from the right tool.
- **Image** of a video URL now downloads the video's **thumbnail**; of a gallery URL, the whole gallery.
- Added a folder picker to every download, an adaptive status line, and a **Video: Exact Format Selection** preference that unlocks per-format selection with file sizes.

## [Feat: Webpage Saving] - 2026-05-19

- Added webpage saving — paste any non-video/gallery/music URL into **Download** or **Fast Download** and it is saved as a single self-contained `.html` file via monolith, with a Complete / Lightweight (no JavaScript) choice.

## [Feat: Fast Download Command] - 2026-05-19

- Added the **Fast Download** command — pass a URL as an argument and download it instantly using your saved defaults, with no form.

## [Improvement] - 2026-01-28

- Added MP3 format option for audio downloads
- Fixed slow video info loading for playlist URLs
- Fixed download progress not updating in real-time

## [Fix: Windows Path Resolution Issues] - 2025-12-07

- Resolved error with `winget` command detection on Windows systems
- Fixed path validation issue where `fs.existsSync()` incorrectly returned false for existing Windows paths

## [Feat: Windows Update Libraries Support] - 2025-12-07

- Added support for updating yt-dlp and FFmpeg on Windows using winget

## [Improvement] - 2025-11-11

- Updated extension icon.

## [Fix: Update Button Text to "Open in Explorer" on Windows] - 2025-10-20

- The text on the "Open in Finder" button will now display "Open in Explorer" on Windows.

## [Fix: Instagram Same Title Issue] - 2025-10-03

- Resolved a bug where videos from the same Instagram user overwrote each other due to identical filenames. Filenames now include both username and video ID for uniqueness.
- Updated dependencies.

## [Fix: Long Video Name Compatibility] - 2025-09-29

- Resolved issues with long video names on Windows and macOS.
- Automatically removes invalid characters from video file names to ensure compatibility.

## [Fix: Add install flags] - 2025-09-15

- Added acceptance flags when installing packages with winget.

## [Feat: Windows Support] - 2025-09-12

- Added support for Windows OS, enabling video downloads and transcript extraction on Windows devices.
- Ensured compatibility with Windows-specific file paths and dependencies.
- Improved installation and setup instructions for Windows users.
- Fixed platform-specific bugs to provide a seamless experience across Windows and macOS.

## [Chore: Fixed a typo in the installation view] - 2025-08-22

## [Fixes] - 2025-03-07

- Avoid to run `onSubmit` while fetching video

## [Features] - 2025-03-05

Enhanced extension with AI. You can now download videos and extract transcripts by @-mentioning the extension in Raycast AI.

- Add a new tool for downloading videos
- Add a new tool for extracting transcripts

## [Improvements] - 2025-03-05

- Add support to manage installed Homebrew libraries
- Add support for checking if libraries outdated
- Adjust preferences usage code to make used options more intuitive
- Organize command views to keep entry file clean
- Update tsconfig lib to `es2022` to match Node.js 18

## [Features] - 2025-03-04

- Add support for downloading all possible formats
- Use a short & good video for placeholder
- Update screenshot

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
