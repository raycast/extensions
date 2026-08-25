# Music List (Raycast Extension)

[![Raycast Extension](https://img.shields.io/badge/Raycast-Extension-red?logo=raycast&logoColor=white)](https://raycast.com)
[![Platform](https://img.shields.io/badge/Platform-Windows-blue)](https://raycast.com)

A powerful, lightweight **Raycast for Windows** extension to quickly search, browse, and play your local music library directly from Raycast.

---

## ✨ Features

- 📁 **Subfolder Navigation & Routing**  
  Browse your music directory hierarchically by folder or access all tracks in a unified view.

- 🎵 **Rich Song Metadata**  
  Automatically extracts and displays key audio metadata powered by `music-metadata`:
  - Song Title & Artist
  - Album Name
  - Track Duration (`mm:ss`)
  - Audio Format / Codec (e.g., `MP3`, `FLAC`, `WAV`, `OGG`)

- 🔀 **Flexible Playback Options**  
  - **Play Song:** Launch any song with your system's default media player.
  - **Play All in Folder:** Generate on-the-fly `.m3u8` playlists to queue an entire directory.
  - **Shuffle & Play All:** Play the whole folder in randomized order.
  - **Play Random:** Instantly pick and play a single random track from the current folder.

- ⚡ **Instant Search & High Performance**  
  Search across title, artist, album, folder relative path, and audio formats. Uses smart local caching and chunked async scanning for smooth startup and instant search results.

- 📂 **Windows Explorer Integration**  
  Quickly open selected songs or parent folders directly in Windows File Explorer.

- 🔄 **Manual Refresh**  
  Re-scan your music library on demand whenever new files are added or moved.

---

## 🛠 Preferences & Configuration

Configure the extension preferences via Raycast Settings (`Cmd/Ctrl + ,`):

| Preference Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `musicFolder` | Directory | `~/Music` | Path to your local music directory to scan. |
| `audioExtensions` | Text Field | `.mp3,.flac,.wav,.ogg` | Comma-separated list of supported audio file extensions. |

---

## 🚀 Development & Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- Raycast for Windows

### Installation

```bash
# Clone repository and install dependencies
npm install
```

### Command Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Raycast extension development mode |
| `npm run build` | Build production bundle |
| `npm run lint` | Run Raycast linter checks |
| `npm run fix-lint` | Automatically fix linting issues |
| `npm run format` | Format codebase using Prettier |

---

## 📂 Project Structure

```text
music-list/
├── src/
│   ├── ff.tsx                    # Main extension command entry point
│   ├── components/
│   │   ├── FolderListItem.tsx    # Folder list item component with actions
│   │   ├── FolderSongsView.tsx   # Detailed folder view (Play All, Shuffle, Songs)
│   │   ├── SongItem.tsx          # Individual song item displaying metadata
│   │   └── RefreshAction.tsx     # Action shortcut to refresh library cache
│   ├── utils/
│   │   ├── cache.ts              # Local storage cache management
│   │   ├── helpers.ts            # Metadata reading, duration formatting & chunking
│   │   └── lib.ts                # Windows command helper utilities
│   └── types.ts                  # TypeScript interfaces (Song, Preferences)
└── package.json                  # Extension manifest & dependencies
```

---

## 🧰 Tech Stack

- **Framework:** [Raycast API](https://developers.raycast.com/) (`@raycast/api`, `@raycast/utils`)
- **Metadata Parsing:** [`music-metadata`](https://github.com/Borewit/music-metadata)
- **Language:** TypeScript & React
