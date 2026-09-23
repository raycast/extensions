<div align="center">

<img src="media/fetch-icon.png" width="128" alt="Fetch">

# Fetch

[![Raycast Store](https://img.shields.io/badge/Raycast-Store-FF6363?style=flat-square&logo=raycast&logoColor=white)](https://www.raycast.com/chrismessina/fetch)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-22C55E?style=flat-square)](LICENSE)
[![Follow @chrismessina](https://img.shields.io/github/followers/chrismessina?label=Follow%20chrismessina&style=social)](https://github.com/chrismessina)
[![Stars](https://img.shields.io/github/stars/chrismessina/raycast-fetch?style=social)](https://github.com/chrismessina/raycast-fetch/stargazers)

**Download a link, a list of links, or a whole numbered sequence — without leaving Raycast or waiting on a browser window.**

[Features](#features) • [Requirements](#requirements) • [Quick Start](#quick-start) • [Usage](#usage) • [Development](#development)

</div>

---

## Features

- **Downloads keep running after you close Raycast** — each transfer is handed to a background process that outlives the command, so dismissing the window does not kill a download in progress.
- **Real filenames, not `download.bin`** — the name comes from the server's `Content-Disposition` header when it sends one, falling back to the URL path, and gains the right extension from the content type when the URL has none.
- **Batch downloads from messy input** — paste one URL per line, a wall of prose with links in it, or markdown links. Duplicates are removed. A live list shows per-file status, percentage, and speed.
- **Curl-style range patterns** — `https://example.com/file[001-025].zip` expands into 25 downloads. Zero-padding is inferred from the start value, descending ranges work, and the batch form previews the expansion before you commit to it.
- **Nothing silently overwrites** — a colliding filename gets a ` (1)` suffix unless you opt into overwriting, and concurrent downloads reserve their names up front so two files in the same batch can never collide.
- **Interrupted transfers can resume** — a partial file is kept and continued with an HTTP range request, validated against the server's ETag so a changed file restarts instead of corrupting.
- **History with the actions you actually want** — the last 100 downloads, with open, reveal in Finder, copy URL, copy path, and re-download. Failed entries keep their error message.
- **Import every open browser tab** with ⌘⇧B, via the Raycast browser extension.

---

## Requirements

- [Raycast](https://www.raycast.com/) on macOS
- `curl`, which ships with macOS — there is nothing to install
- The [Raycast browser extension](https://www.raycast.com/browser-extension), **only** for importing open tabs

---

## Quick Start

1. Copy a URL to your clipboard
2. Open Raycast and search for **"Download"** — the clipboard URL is used automatically if you do not type one
3. The file lands in `~/Downloads` (or wherever you point **Output Directory**), and the completion toast offers **Show in Finder** and **Open File**

---

## Usage

### Commands

| Command | Mode | Description |
| --- | --- | --- |
| Download | `no-view` | Downloads a single URL taken from the argument or the clipboard. A range pattern hands off to Download Batch automatically. |
| Download Batch | `view` | Downloads many URLs at once with a live progress list. Pre-fills from the clipboard. |
| Download History | `view` | The last 100 downloads, with actions for each. |

### Actions

| Action | Shortcut | Description |
| --- | --- | --- |
| Show in Finder | `⌘ ⏎` | Reveals the finished file |
| Open File | `⌘ O` | Opens it in the default application |
| Import URLs from Browser Tabs | `⌘ ⇧ B` | Appends every open tab to the batch form |
| Retry | `⌘ R` | Re-runs a failed download |
| Cancel / Cancel All | `⌃ X` / `⌘ ⇧ .` | Stops one download, or every running download |
| Copy Error | `⌘ ⇧ E` | Copies the failure message |
| Delete Entry | `⌃ X` | Removes a history entry — the downloaded file is left alone |

### Preferences

| Preference | Values | Default |
| --- | --- | --- |
| Output Directory | any folder | `~/Downloads` |
| Overwrite Existing | on / off | off |
| Follow Redirects | on / off | on |
| Stall Timeout | seconds | `300` |
| Max Parallel Downloads | 1–10 | `3` |
| Debug Logging | on / off | off |
| Strict Redaction | on / off | off |

**Strict Redaction** also masks every URL query string and fragment in the logs, not just values it recognizes as secrets by name. Turn it on before reproducing a problem you plan to share a log of.

**Stall Timeout is an idle limit, not a time limit.** It is the number of seconds a transfer may go without receiving *any* data before it is abandoned. A large file downloading slowly is left alone for as long as it keeps making progress.

The batch form's output directory overrides the preference for that batch only.

---

## Development

### Project Structure

```
raycast-fetch/
├── src/
│   ├── download.ts              # Single download (no-view)
│   ├── download-batch.tsx       # Batch form + progress list
│   ├── download-history.tsx     # History list
│   ├── lib/                     # Downloader adapter, URLs, history, toasts, prefs
│   ├── views/                   # List views
│   └── actions/                 # Action panels
├── scripts/sync-runner.mjs      # Copies the downloader runner into assets/
├── assets/                      # Extension icon + runner bundle (runtime)
├── media/                       # README images
└── package.json
```

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start in development mode with hot reload |
| `npm run build` | Build for production |
| `npm run lint` | Run Raycast ESLint config |
| `npm run fix-lint` | Auto-fix lint issues |
| `npm run publish` | Publish to the Raycast Store |

`ray build` bundles with esbuild and does **not** typecheck — run `npx tsc --noEmit` separately.

### Clone & Run

```sh
git clone https://github.com/chrismessina/raycast-fetch.git
cd raycast-fetch
npm install
npm run dev
```

---

## Tech Stack

| Package | Role |
| --- | --- |
| `@raycast/api` | Raycast extension primitives |
| `@chrismessina/raycast-downloader` | Detached download runner, resume, failure classification |
| `@chrismessina/raycast-kit` | Failure toasts with a Copy Error action, count formatting |
| `@chrismessina/raycast-logger` | Logging gated on the Debug Logging preference |

---

MIT © [Chris Messina](https://github.com/chrismessina)
