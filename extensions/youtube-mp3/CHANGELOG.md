# All notable changes to this project will be documented in this file

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

---

## [1.0.0] - {PR_MERGE_DATE}

### ✨ Added

- **Automatic video title fetching**: the extension now retrieves the YouTube video title automatically after pasting the link.
- **Persistent output directory**: the last selected folder is automatically saved and reloaded on the next use.
- **Automatic executable detection**: the extension now locates the `yt-dlp` executable on macOS, Windows, and Linux.
- **Language auto-detection**: interface automatically switches between **English** and **Portuguese (PT-BR)** based on system locale.
- **Animated progress toasts**: shows real-time download progress percentage while converting and downloading audio.

### 🛠️ Improved

- **Cleaner and more minimal interface**: replaces unnecessary fields with dynamic descriptions for title and audio quality.
- **Smarter path validation**: ensures that invalid or deleted folders are automatically cleared and re-prompted.
- **Unified high-quality audio setting**: defaults to 320 kbps MP3 for maximum clarity.
- **Localized text strings**: all user feedback, toasts, and titles are now fully bilingual.
