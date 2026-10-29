<div align="center">

<img src="media/threads-icon.png" width="128" alt="Threads">

# Threads

[![Raycast Store](https://img.shields.io/badge/Raycast-Store-FF6363?style=flat-square&logo=raycast&logoColor=white)](https://www.raycast.com/chrismessina/threads)
[![License MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)
[![Follow @chrismessina](https://img.shields.io/github/followers/chrismessina?label=Follow%20chrismessina&style=social)](https://github.com/chrismessina)
[![Stars](https://img.shields.io/github/stars/chrismessina/raycast-threads?style=social)](https://github.com/chrismessina/raycast-threads/stargazers)

**Post to Threads, jump straight to any feed, download media from a post, check your analytics, and draw giveaway winners, all from Raycast.**

[Features](#features) • [Requirements](#requirements) • [Quick Start](#quick-start) • [Usage](#usage) • [Development](#development)

</div>

---

## Features

- **Download media from a public post** — images, videos, and voice posts, saved straight to your Downloads folder. Carousels download every item.
- **Paste a post link in any of its forms** — a canonical post URL, one with tracking parameters, or a `threads.com/share/…` short link. A post Threads won't show to a signed-out visitor can't be downloaded.
- **Files are named correctly** — the extension reads the format the server actually sent rather than trusting the URL, so an image that is really WebP does not land as a broken `.jpg`.
- **Nothing is ever overwritten** — a download whose name is already taken saves alongside as `name (1).ext`, and a download's content is written to a `.part` file that takes its real name only once it finishes.
- **Optional format conversion** — keep the original, or convert images to JPEG or PNG on the way in.
- **Analytics** — raw account metrics for the last 7, 14, 30, or 90 days, and lifetime totals for your posts from that period, plus a menu bar item showing the metric of your choice.
- **Giveaways** — draw winners from the replies to one of your posts, filtered by keywords, mentions, reply time, or excluded accounts.
- **Post and navigate** — compose a post or follow an account and finish in Threads, or open a profile, a search, or any of your feeds or activity tabs.

---

## Requirements

- [Raycast](https://www.raycast.com/) installed
- macOS, for the optional **Image Format** conversion only. Everything else works on macOS and Windows alike.
- A **Threads Access Token**, for **Analytics**, **Analytics Menu Bar**, and **Giveaway** only. It needs the `threads_basic`, `threads_manage_insights`, and `threads_read_replies` permissions. Follow the [token guide](https://threads-analytics.app/en/token-guide), then paste the token into **Threads Access Token** in the extension preferences. Tokens expire after 60 days.

---

## Quick Start

1. Copy a Threads post link — from the share sheet, the address bar, or a `/share/` link someone sent you.
2. Open Raycast and search for **"Download Threads Media"**.
3. Paste the link. The media lands in your Downloads folder, or wherever you point **Media Download Path**.

> **If "Finding Media" is slow:** Threads sometimes takes 10–30 seconds to answer a request
> it hasn't seen from you recently. Open the post in a browser where you're signed in to
> Threads, Instagram, or Facebook, then run the download. It is usually much faster after that.

---

## Usage

### Commands

| Command | Mode | Description |
| --- | --- | --- |
| Download Threads Media | `no-view` | Download images, videos, and voice posts from a post URL |
| Start a New Thread | `view` | Compose a post in a form, with an optional link |
| Quick Post | `no-view` | Post straight from the Raycast bar |
| Quick Follow | `no-view` | Follow an account by username |
| View Profile | `no-view` | Open a profile |
| Search | `no-view` | Search Threads by keyword or hashtag, sorted by top or recent |
| My Feeds | `no-view` | Open For You, Following, Liked, or Saved |
| Activity | `no-view` | Open any activity tab — replies, mentions, quotes, reposts, and more |
| Insights | `no-view` | View account insights over 7, 14, 30, or 90 days |
| Analytics | `view` | Raw account and post metrics from the Threads API |
| Analytics Menu Bar | `menu-bar` | A Threads metric in the menu bar, refreshed every 30 minutes |
| Giveaway | `view` | Draw winners from the replies to one of your posts |

### Actions

| Action | Shortcut | Description |
| --- | --- | --- |
| Show in Finder | `⌘ O` | Reveal a completed download |
| Copy Path | `⌘ ⇧ C` | Copy the saved file's path |
| Copy Error | — | Copy the details of a failure, for a bug report (`⌘ ⇧ C` in the Analytics and Giveaway error views) |

### Preferences

| Preference | Values | Default |
| --- | --- | --- |
| Threads Access Token | a token | — |
| Debug Logging | on / off | off |
| Strict Redaction | on / off | off |
| Media Download Path | a folder | `~/Downloads` |
| Image Format | Original / JPEG / PNG | Original |

**Media Download Path** and **Image Format** are preferences of the *Download Threads Media*
command — expand it in the extension's settings to find them. **Analytics Menu Bar** has its own
**Menu Bar Title** (follower count by default, or views, likes, replies, your latest post, or icon
only) and **Period** (last 7 days by default).

---

## Development

### Project Structure

```
raycast-threads/
├── src/
│   ├── download-thread-media.tsx   # downloads a post's media
│   ├── analytics*.tsx, giveaway.tsx  # Threads API commands (need a token)
│   ├── new-thread.tsx              # compose form
│   ├── *.tsx                       # URL-builder commands
│   └── lib/
│       ├── threads-post.ts         # resolves a link to its media
│       ├── threads-api.ts          # Threads Graph API client
│       ├── media-files.ts          # paths, conversion, extensions
│       ├── download-media.ts       # streams a download to disk
│       └── *.test.ts               # vitest, colocated
├── assets/                         # extension icon (runtime)
├── media/                          # README images
├── metadata/                       # Store screenshots
├── package.json
└── tsconfig.json
```

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start in development mode with hot reload |
| `npm run build` | Build for production |
| `npm run lint` | Run Raycast ESLint config |
| `npm run fix-lint` | Auto-fix lint issues |
| `npm test` | Run the test suite — no network |
| `npm run test:live` | Resolve real posts against threads.com |
| `npm run publish` | Publish to the Raycast Store |

### Clone & Run

```sh
git clone https://github.com/chrismessina/raycast-threads.git
cd raycast-threads
npm install
npm run dev
```

See [AGENTS.md](AGENTS.md) for how media resolution works and why it is shaped the way it is.

---

## Tech Stack

| Package | Role |
| --- | --- |
| `@raycast/api` | Raycast extension primitives |
| `@chrismessina/raycast-kit` | Failure toasts with a Copy Error action, byte formatting, plurals |
| `@chrismessina/raycast-logger` | Structured logging; Debug Logging adds detail, errors always log |

---

MIT © [Chris Messina](https://github.com/chrismessina)
