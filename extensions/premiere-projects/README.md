# Premiere Pro Projects — Raycast Extension

<p align="center">
  <img src="media/extension-icon.png" width="128" height="128" alt="Premiere Pro Projects Icon" />
</p>

<p align="center">
  <strong>Fast visual search, recent project tracking, and media cache management for Adobe Premiere Pro on macOS and Windows.</strong>
</p>

---

## 🎬 Overview

**Premiere Pro Projects** brings your video projects and timeline assets directly into Raycast. Designed for video editors, motion designers, and content creators, it provides instant access to your recently edited projects, lightning-fast fuzzy search across storage scopes, deep metadata inspection (sequences, resolution, aspect ratio, frame rate), and safe tools to clear bloated media caches.

---

## ✨ Features

- 🕒 **Accurate Recent Projects**: Discovers genuine recently opened projects from Adobe Premiere Pro's profile preferences (`Adobe Premiere Pro Prefs` XML MRU list), Adobe MediaBrowser records, and system-level recents on both macOS and Windows.
- 🔎 **Deep Project Search**: Search Premiere Pro (`.prproj`) projects by project title, parent directory, sequence names, or production name.
- 🎬 **Native Metadata Extraction**: Automatically decompresses and parses gzip-compressed `.prproj` files to extract project schema version, sequence lists, timeline dimensions, aspect ratios, and frame rates without external dependencies.
- 📁 **Adobe Productions Aware**: Automatically identifies projects that are part of an Adobe Production structure (via `.prodset` detection) and labels them clearly.
- 🔲 **Grid & List Views**: Switch seamlessly between visual cards and dense list rows with full metadata inspector sidebar (`⌘V` on macOS, `Ctrl+V` on Windows).
- 🧹 **Safe Media Cache Cleaner**: Free up gigabytes of disk space by purging Premiere Pro's temporary conformed audio (`.cfa`) and waveform peak (`.pek`) files while preserving critical user data and settings.
- 🛡️ **Defensive File Operations**: Rename projects with case-collision safety on case-preserving filesystems, backdate/frontdate project timestamps, and delete files with explicit confirmation dialogs.

---

## ⚡ Commands

| Command | Mode | Description |
|---|---|---|
| **Recent Projects** | View | Browse and open recently used Premiere Pro projects and productions in Grid or List view. |
| **Search Projects** | View | Fast search for Premiere Pro (`.prproj`) projects across your system. |
| **Clear Media Cache** | No-View | Safely purge Premiere Pro temporary Media Cache and Peak waveform files. |

---

## ⌨️ Keyboard Shortcuts

| Shortcut (macOS) | Shortcut (Windows) | Action |
|---|---|---|
| `↵` (Return) | `Enter` | Open project in Adobe Premiere Pro |
| `⌘Y` | `Space` / `Quick Look` | Quick Look rendered artwork / project preview |
| `⌥⌘R` | `Alt+Ctrl+R` | Rename Project (collision & path safe) |
| `⌥⌘D` | `Alt+Ctrl+D` | Edit Date Attributes (Backdate / Frontdate) |
| `⌘V` | `Ctrl+V` | Toggle between Grid View and List View |
| `⌘R` | `Ctrl+R` | Refresh file listings |
| `⇧⌘C` | `Shift+Ctrl+C` | Copy Project File Path |
| `⌥⌘K` | `Alt+Ctrl+K` | Purge Premiere Pro Media Cache |
| `^X` | `Ctrl+X` | Delete Project (requires confirmation) |

---

## ⚙️ Preferences

Customize the extension via **Raycast Preferences** (`⌘,` on macOS, `Ctrl+,` on Windows):

- **Default View Mode**: Choose between **Grid View** (visual cards) and **List View** (detailed sidebar).
- **Grid Columns**: Choose between 3, 4, 5, 6, or 8 columns in Grid view (default: 5).
- **Search Scope**: Search within your **User Home** (`~`) or across your **Entire System** (`/`).

---

## 🛠️ Supported Formats

- `.prproj` — Adobe Premiere Pro Project (Gzip-compressed XML)
- `.mogrt` — Motion Graphics Template
- `.prfpset` — Premiere Pro Effect Preset
- `.prodset` — Adobe Production Configuration

---

## 🖥️ Platform Architecture

- **macOS Adapter**: Reads `~/Documents/Adobe/Premiere Pro/<Version>/Profile-*/Adobe Premiere Pro Prefs`, `~/Library/Preferences/com.adobe.mediabrowser.plist`, and Spotlight metadata (`mdfind`). Generates quicklook previews via `/usr/bin/qlmanage`.
- **Windows Adapter**: Reads `%USERPROFILE%\Documents\Adobe\Premiere Pro\<Version>\Profile-*\Adobe Premiere Pro Prefs`, `%APPDATA%\Microsoft\Windows\Recent`, and scoped PowerShell file discovery.
- **Shared Layer**: Native `.prproj` decompression (`zlib`), XML parser, SVG card renderer, collision-proof file operations, and responsive Raycast UI components.

---

## 📄 License

MIT License.
