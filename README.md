# 🔍 raycast-everything-search

Search files on Windows instantly with Everything engine — native Raycast list UI.

[![Raycast Store](https://img.shields.io/badge/Raycast-Store-red)](https://www.raycast.com/moviezhou/raycast-everything-search)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![platform](https://img.shields.io/badge/platform-windows-blue)](https://www.raycast.com/)

## ✨ Features

- ⚡ **Instant search** — powered by Voidtools Everything NTFS index, results in milliseconds
- 🖥️ **Native Raycast UI** — file list with icons, keyboard navigation, Action Panel
- 🌏 **Chinese support** — full GBK/CP936 encoding support for Chinese filenames and paths
- 📁 **File actions** — Open file, Show in Explorer, Copy path, Open with...
- 🔧 **Configurable** — custom es.exe path, max results limit

## 📦 Installation

### Prerequisites

- [Raycast](https://raycast.com/) for Windows (v0.66+)
- [Everything](https://www.voidtools.com/) by Voidtools (installed and running — es.exe is included)

### Option 1: Install from Store (recommended)

1. Open Raycast (`Ctrl+Space`)
2. Search `Store` and open it
3. Search for `Everything Search`
4. Click Install

### Option 2: Install from source

```bash
git clone https://github.com/moviezhou/raycast-everything-search.git
cd raycast-everything-search
npm install
npx ray build -o "%APPDATA%\..\Local\Raycast\extensions\raycast-everything-search"
```

Then restart Raycast.

### Option 3: Development mode

```bash
git clone https://github.com/moviezhou/raycast-everything-search.git
cd raycast-everything-search
npm install
npx ray dev
```

Keep the terminal open — Raycast will load the extension in development mode with hot-reload.

## 🚀 Usage

1. Open Raycast (`Ctrl+Space`)
2. Type `Search Everything`
3. Enter your search query
4. Browse results with arrow keys and press `Enter` to open
5. Press `Ctrl+K` for more actions (Show in Explorer, Copy path, etc.)

### Search syntax

Everything supports a powerful query language:

| Syntax | Example | Description |
|---|---|---|
| `ext:` | `ext:pdf` `ext:docx;xlsx` | Filter by file extension |
| `folder:` | `folder:D:\work` | Limit search to a specific folder |
| `dm:` | `dm:today` `dm:thisweek` | Filter by date modified |
| `size:` | `size:>10mb` `size:1mb..10mb` | Filter by file size |
| `file:` / `folder:` | `file:` / `folder:` | Files only / folders only |
| `!` | `!*.tmp` | Exclude pattern |
| `""` | `"quarterly report"` | Exact phrase match |
| `content:` | `content:"budget"` | Search file contents (requires Everything content indexing) |

## ⚙️ Preferences

Configure these in Raycast → Extensions → Everything Search:

| Preference | Default | Description |
|---|---|---|
| **es.exe Path** | `C:\Program Files\Everything\es.exe` | Path to Everything's command-line tool |
| **Max Results** | `50` | Maximum number of search results to display |

## 🧰 Tech Stack

- [Raycast API](https://developers.raycast.com/) — Extension framework
- [TypeScript](https://www.typescriptlang.org/) + [React](https://react.dev/)
- [iconv-lite](https://github.com/ashtuchkin/iconv-lite) — Chinese encoding conversion
- [Everything](https://www.voidtools.com/) — NTFS search engine

## 📄 License

MIT © [Movie](https://github.com/moviezhou)

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit PRs on [GitHub](https://github.com/moviezhou/raycast-everything-search).
