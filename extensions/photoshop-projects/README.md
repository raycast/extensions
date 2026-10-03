# Photoshop Projects — Raycast Extension

<p align="center">
  <img src="assets/extension-icon.png" width="128" height="128" alt="Photoshop Projects Icon" />
</p>

<p align="center">
  <strong>Fast, visual search, recents tracking, and quick management for Adobe Photoshop documents on macOS.</strong>
</p>

---

## 🎨 Overview

**Photoshop Projects** is a native Raycast extension designed specifically for designers, digital artists, photographers, and creators who frequently work with Adobe Photoshop.

Instead of waiting for heavy Creative Cloud dashboards to load or relying on generic macOS document icons, **Photoshop Projects** renders genuine visual artwork thumbnails directly inside Raycast, tracks real recent files based on Photoshop's actual usage history, offers instant full-resolution Quick Look (`⌘Y`) previews, and provides rapid tools to purge Photoshop caches and spawn new project canvases.

---

## ✨ Features

- 🖼️ **Visual-First Thumbnail Previews**: Renders high-fidelity PNG representations of your PSD/PSB artwork directly in grid cards and list rows. No more guessing by file name or staring at identical blue Adobe PSD icons.
- 👁️ **True Quick Look (`⌘Y`)**: Quick Look displays the rendered PNG artwork in full resolution with color fidelity.
- 🕒 **Accurate Photoshop Recents**: Queries Adobe Photoshop's MediaBrowser MRU database, preferences, and ExtendScript engine to list files in the true chronological order they were opened inside Photoshop.
- 🔎 **Deep Spotlight Search**: Instant fuzzy searching across `.psd`, `.psb`, `.psdt`, and `.pdd` documents. Search by document title, folder, path, or indexed Photoshop layer names.
- 🔲 **Grid & List Views**: Seamlessly switch between a visual card grid (default) and a dense list with technical metadata sidebar via `⌘V`.
- 🧹 **Purge Photoshop Caches**: Free up RAM and disk space by purging Photoshop's in-memory undo/clipboard caches and cleaning temporary scratch files with a single action.

---

## ⚡ Commands

| Command | Mode | Description |
|---|---|---|
| **Recent Projects** | View | Browse and open recently used Photoshop files and projects in Grid or List view. |
| **Search Projects** | View | Fast search across Photoshop files on your Mac by filename, folder, or layer. |
| **Clear Photoshop Cache** | No-View | Purge Photoshop memory/clipboard caches and clean temporary scratch files. |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `↵` (Return) | Open document in Adobe Photoshop |
| `⌘Y` | Quick Look rendered artwork preview |
| `⌘V` | Toggle between Grid View and List View |
| `⌘↵` | Reveal document in macOS Finder |
| `⇧⌘↵` | Open in New Finder Window |
| `⌥⇧T` | Open in New Finder Tab |
| `⌥⌘D` | Edit Date Attributes (Backdate / Frontdate) |
| `⌥⌘R` | Rename Document |
| `⌥⌘K` | Purge Photoshop caches |
| `⌘R` | Refresh file listings |

---

## ⚙️ Preferences

Customize the extension via **Raycast Preferences** (`⌘,`):

- **Default View Mode**: Choose between **Grid View** (visual artwork cards) and **List View** (dense list with metadata details).
- **Grid Columns**: Choose between 3, 4, 5, 6, or 8 columns in Grid view.
- **Search Scope**: Search within your **Home Folder** (`~`) or across your **Entire System** (`/`).

---

## 🛠️ Supported Formats

- `.psd` — Adobe Photoshop Document
- `.psb` — Adobe Photoshop Large Document Format
- `.psdt` — Adobe Photoshop Document Template
- `.pdd` — Adobe PhotoDeluxe / Photoshop Document

---

## 📄 License

MIT License. Designed with ❤️ for the Raycast Community.
