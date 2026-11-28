# Premiere Pro Projects — Raycast Extension

<p align="center">
  <img src="media/extension-icon.png" width="128" height="128" alt="Premiere Pro Projects Icon" />
</p>

<p align="center">
  <strong>Fast visual search, recent project tracking, and media cache management for Adobe Premiere Pro on macOS and Windows.</strong>
</p>

---

## 🎬 Overview

**Premiere Pro Projects** brings your video projects and timeline assets directly into Raycast. Designed for video editors, motion designers, and content creators, it provides instant access to your recently edited projects, fast project search across storage scopes, metadata inspection (sequences, resolution, aspect ratio, frame rate), and safe tools to clear bloated media caches.

---

## ✨ Features

- 🕒 **Accurate Recent Projects**: Discovers recently opened `.prproj` projects from Adobe Premiere Pro's profile preferences (`Adobe Premiere Pro Prefs` XML MRU list), Adobe MediaBrowser records (macOS), Spotlight recent documents (macOS), and Windows Recent shortcuts (Windows). Filter recent projects by title, filename, parent directory, sequence names, or production name.
- 🔎 **Project Search**: Search Premiere Pro (`.prproj`) files by filename across your User Home, System Drive, external volumes, or Global scope.
- 🎬 **Native Metadata Extraction**: Automatically decompresses a whole project buffer and parses gzip-compressed (or uncompressed) `.prproj` files to extract project schema version, sequence lists, timeline dimensions, aspect ratios, and frame rates without external dependencies.
- 📁 **Adobe Productions Aware**: Automatically identifies projects that are part of an Adobe Production structure (via `.prodset` or `production.prodset` detection) and labels them clearly.
- 🔲 **Grid & List Views**: Switch seamlessly between visual cards and dense list rows with a full metadata inspector sidebar (`⌘V` on macOS, `Ctrl+V` on Windows).
- 🧹 **Safe Media Cache Cleaner**: Free up disk space by clearing Premiere Pro's temporary `Media Cache Files`, `Media Cache`, and `Peak Files` directories (such as `.cfa` and `.pek` files) while preserving your project files and settings.
- 🛡️ **Defensive File Operations**: Rename projects with case-collision and invalid-character safety, backdate/frontdate project timestamps, and move projects to Trash with explicit confirmation dialogs.

---

## ⚡ Commands

| Command               | Mode    | Description                                                                                 |
| --------------------- | ------- | ------------------------------------------------------------------------------------------- |
| **Recent Projects**   | View    | Browse and open recently edited Premiere Pro projects and productions in Grid or List view. |
| **Search Projects**   | View    | Search Premiere Pro (`.prproj`) projects across your system.                                |
| **Clear Media Cache** | No-View | Safely clean Premiere Pro temporary Media Cache and Peak files.                             |

---

## ⌨️ Keyboard Shortcuts

| Shortcut (macOS) | Shortcut (Windows) | Action                                              |
| ---------------- | ------------------ | --------------------------------------------------- |
| `↵` (Return)     | `Enter`            | Open project in Adobe Premiere Pro                  |
| `⌘M`             | —                  | Open in Adobe Media Encoder (macOS, when installed) |
| `⌘Y`             | `Ctrl+Y`           | Quick Look preview                                  |
| `⌥⌘R`            | `Alt+Ctrl+R`       | Rename Project (collision & path safe)              |
| `⌥⌘D`            | `Alt+Ctrl+D`       | Edit Date (Backdate / Frontdate)                    |
| `⌘V`             | `Ctrl+V`           | Switch between Grid View and List View              |
| `⌘R`             | `Ctrl+R`           | Refresh Projects                                    |
| `⌃⌘C`            | `Alt+Shift+C`      | Copy File Path                                      |
| `⌥⌘K`            | `Alt+Ctrl+K`       | Clear Media Cache (requires confirmation)           |
| `⌃X`             | `Ctrl+X`           | Delete Project (moves to Trash after confirmation)  |

---

## ⚙️ Preferences

Customize the extension via **Raycast Preferences** (`⌘,` on macOS, `Ctrl+,` on Windows):

- **Default View Mode**: Choose between **Grid View** (visual cards) and **List View** (detailed sidebar).
- **Grid Columns**: Choose between 3, 4, 5, 6, or 8 columns in Grid view (default: 5).
- **Search Scope**: Search within your **User Home (~)** or across your **Entire System**.

---

## 🛠️ Supported Formats

- `.prproj` — Adobe Premiere Pro Project (Gzip-compressed or uncompressed XML)

---

## 🖥️ Platform Architecture

- **macOS Adapter**: Reads `~/Documents/Adobe/Premiere Pro/<Version>/Profile-*/Adobe Premiere Pro Prefs`, `~/Library/Preferences/com.adobe.mediabrowser.plist`, and Spotlight metadata (`mdfind`). Generates Quick Look thumbnails via `/usr/bin/qlmanage`.
- **Windows Adapter**: Reads `%USERPROFILE%\Documents\Adobe\Premiere Pro\<Version>\Profile-*\Adobe Premiere Pro Prefs`, `%APPDATA%\Microsoft\Windows\Recent`, and scoped PowerShell file discovery (`Get-ChildItem`).
- **Shared Layer**: Native `.prproj` decompression (`zlib`), XML parser, SVG card renderer, collision-proof file operations, and responsive Raycast UI components.

---

## 📄 License

MIT License.
