# The Downloader Changelog

## [Chat About Video & AI Skills] - {PR_MERGE_DATE}

- **New Chat About Video command.** Paste a YouTube (or any yt-dlp) link and ask anything about it. The transcript is loaded with timestamps, along with the title, channel, chapters, tags, description and statistics — views, likes, comments, subscribers, views per day, likes per 100 views and comments per 1,000 views. Answers stream in with timestamps you can click to jump to that moment. Suggested questions cover a summary, key takeaways, a chapter breakdown, arguments, quotes, action items, performance and audience. Copy or save a conversation as Markdown, copy the whole video context for any other AI, or save the timestamped transcript. Chats are kept, so you can continue them from the command's Recent Chats. Available from the Download form, Media Preview, the live view and Download History (⌘⇧A).
- **Choose your AI.** Raycast AI (with a model picker), Apple Intelligence on macOS 27 (on-device) through the system `fm` tool, or a local Ollama model. Automatic picks the first one available. Long transcripts that don't fit a small model are handled by sending the most relevant passages, or by reading part by part for summaries.
- **Videos without captions still open**, answering from the title, description, chapters and statistics. A failed caption download (for example YouTube's HTTP 429) no longer stops the chat from loading, and it's retried the next time you open it.
- **Raycast AI Chat.** New `get-video-info` tool for a video's details and statistics without downloading. `extract-transcript` now returns the video's details and a timestamped transcript in the video's own language, shares Chat About Video's cache, and tells the model how to link to a moment. Three bundled Skills: Summarize Video, Video Study Notes and Video Performance. New evals cover statistics, summaries and answering in the user's language.
- **Transcripts fetch one caption track**, chosen from the tracks the video lists: uploaded captions first, then the transcription of the spoken language (not a machine translation). That means fewer YouTube rate limits. In Auto, a video in another language still gets its transcript.
- Transcript segments now start at their first spoken line, not at a dropped `[Music]` cue.

## [Live Download View, History & Refreshed Screens] - {PR_MERGE_DATE}

- **See every download live.** Pressing Download now opens a view with a progress ring, speed, time left, downloaded size and elapsed time, a download-speed chart, and a step strip — Prepare → Video → Audio → Merge → Saved when yt-dlp fetches video and audio separately. Galleries and Spotify count files and tracks over time; webpages, transcripts and thumbnails show their step and a running clock. The sidebar lists the title, channel, duration, source, type, format, size, folder and saved file, and the video's thumbnail sits below the chart.
- **Finished and failed downloads stay on screen** with Open File, Show in Finder, Copy File, Copy Path and Download Another, or the full error with Copy Error.
- **Stop is one key away.** While a download runs, Stop Download is the view's first action (↵, or ⌃X) and shows in the action bar, with Open Folder on ⌘↵. It's also the first action on the progress toast.
- **Esc goes back to the form without cancelling** — the download keeps running and its toast keeps reporting progress, as before.
- **Richer progress toasts.** Video and audio toasts in Download and Fast Download show speed and time left next to the percentage (`42% · 5.20 MB/s · 0:12 left`). yt-dlp now reports progress through a machine-readable `--progress-template`, and `--no-quiet` keeps its stream and merge messages visible despite `--print`.
- **Steady speed and time left.** Speed is averaged over a few seconds and time left is worked out from the bytes still to fetch, so the numbers count down smoothly instead of jumping with every update, and the toast and the view agree. The speed chart still shows every reading.
- **Outdated tools are caught before they break a download.** Before a download, The Downloader checks the tools it's about to use (yt-dlp, ffmpeg, Deno, gallery-dl, monolith, spotDL) against Homebrew, winget or spotDL's releases, and offers to update any that are behind in one dialog. Not Now hides the prompt for a day, tools installed some other way get a note to update them yourself, and a yt-dlp older than 90 days is flagged even when no package manager knows about it. If a download fails while its tool is outdated, the error toast says so and offers Update. Turn it off with the new Check for Tool Updates preference.
- **New Download History command.** Everything downloaded with the Download form, Fast Download or Ask The Downloader is listed newest first, grouped by day, searchable by title, channel or site and filterable by type (or just the failed ones). Each entry shows its thumbnail or a type card, with channel, duration, source, format, size, how long it took, folder and file — and flags files that were moved or deleted. Open File, Show in Finder, Copy File/Path, Download Again, Remove and Clear History are one keystroke away. Also available from the Download form and the live view (⌘⇧H).
- **The Download form knows what it's downloading.** Once yt-dlp has read the link, a details line shows the channel, duration, views and the best quality on offer, and every Quality choice shows the resolution and estimated size it will actually fetch for the chosen container (`1080p · ≈ 52.1 MB`, `1080p · 720p max · ≈ 40.2 MB`). Container and audio formats explain their trade-offs.
- **Media Preview (⌘Y)** from the form: thumbnail, title, stats, the start of the description, and a table of the available formats, with channel, subscribers, views, likes, comments, upload date and best quality in the sidebar.
- **Update Libraries is a proper list now**: each tool with what it does, its installed version and a status tag (Up to Date, Update → x.y.z, Not Installed, Check Failed), grouped into Updates Available / Installed / Not Installed. Upgrade one tool or all of them, Check Again (⌘R), copy the version report, or open a tool's website.
- **Fixes.**
  - Deno is required only for YouTube in the Download form; other video sites no longer send you to the installer without it.
  - Links from sites The Downloader doesn't recognize still save as a webpage by default, but the Download form now also offers Video and Audio for them, since yt-dlp supports many more sites.
  - When a download type's tool isn't installed, the setup screen also offers the types that already work (e.g. Download as Video Instead), so a missing tool never blocks the form.
  - WebM downloads prefer WebM streams and fall back to MKV instead of failing when a site has none, and Quality size estimates now match what's actually downloaded.
  - Transcripts never overwrite an existing file with the same title (a number is added).
  - A Spotify download that saves no tracks says "Nothing downloaded" instead of reporting success.
  - The Rosetta prompt is based on the spotDL binary itself: an Intel-only build asks for Rosetta wherever it's installed, and a native one (like Homebrew's) never does. The auto-downloaded spotDL is only installed when its SHA-256 checksum verifies.
  - On Windows, ffmpeg installs and updates through its own winget package (`yt-dlp.FFmpeg`), and Stop ends the whole process tree, including an ffmpeg merge.
  - Download History refreshes while it's open, shows titles as plain text, and re-applies an entry or removal that a download finishing in another command overwrote.
  - Update checks and upgrades are time-limited, so a stalled Homebrew or winget can't hold up a download, and long downloads no longer keep all of the tools' output in memory.
- **Friendlier setup screens.** The installer explains what the missing tool is for instead of an error banner, shows the terminal command as an alternative, lists the tool, package and website in a sidebar (plus whether Spotify credentials are set, for spotDL), and shows that an install is running.
- Upgraded to Raycast API 2.5 and @raycast/utils 2.3, with ESLint 10 and the React 19 / Node 22 types the API expects.

## [Fix: Download Correctness] - {PR_MERGE_DATE}

- **Deno is optional in Fast Download.** A missing Deno no longer blocks the whole video path — only some extractors (e.g. YouTube) benefit from a JS runtime, so sites like Twitch, Vimeo, or TikTok now download without it, matching the AI tool and transcript behavior.
- **Titles with punctuation are no longer mangled.** `sanitizeVideoTitle` cut every title at its last `.`/`!`/`?` — "Mr. Robot S01E01" became "Mr" in the form's title line, transcript filenames, and the AI tool's result. The sentence-boundary cut now applies only to titles that actually exceed the 200-character cap.
- **`watch?v=…&list=…` URLs download one video, not the whole playlist.** The Download form and Fast Download now pass `--no-playlist` like every other yt-dlp call (metadata probe, thumbnails, transcripts, AI tool) — previously the form showed a single video's title, then yt-dlp fetched the entire playlist. Pure playlist URLs still download every entry.
- **Audio downloads no longer fetch the full video.** `-f bestaudio/best` is passed alongside `--extract-audio`, so yt-dlp downloads just the audio stream instead of the best video+audio only to strip the video back out.
- **Long downloads in the Download Video AI tool no longer die at the timeout.** The tool used a _total-runtime_ cap equal to the Network: Idle Timeout (2 minutes by default), killing any healthy download that took longer. It now runs through the shared idle watchdog like every other runner — stalls are still killed, progress is not.
- **Live download progress.** yt-dlp redraws progress with bare `\r` when writing to a pipe, so the percent toast sat at 0% until the end. yt-dlp now gets `--newline`, and the shared line reader also treats `\r`/`\r\n` as line breaks (which makes spotDL's per-track count more robust too).
- **Live-stream detection** no longer misfires on extractors that emit `live_status: null` — only a concrete status other than `not_live` blocks the download.
- **Updater honesty.** The versions list now shows the _installed_ Homebrew version (previously it showed the formula's latest available version, so never-installed tools appeared installed and "up to date"); the outdated check no longer fails as a batch when one tool isn't installed via brew; Upgrade only touches packages the check actually found outdated; and winget's "no applicable upgrade" exit code is recognized in the form Node actually reports, instead of being logged as a failure.
- **Windows installer**: a missing winget now surfaces as an error toast instead of an unhandled error with no feedback.
- **spotDL auto-download network calls are bounded** (30s release lookup, 10min binary download), so a stalled GitHub transfer can no longer leave the Installer's spinner up forever.
- Internal cleanup: removed dead `parseHHMM`/`isValidHHMM`/`checkUpToDate` helpers and the unused audio-only half of the format list; the exact-format dropdown now falls back to yt-dlp's approximate file size when no exact size is published.

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
