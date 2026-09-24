<div align="center">

# Raycast Store Updates

[![Raycast Store](https://img.shields.io/badge/Raycast-Store-FF6363?style=flat-square&logo=raycast&logoColor=white)](https://www.raycast.com/chrismessina/raycast-store-updates)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-22C55E?style=flat-square)](LICENSE)
[![Follow @chrismessina](https://img.shields.io/github/followers/chrismessina?label=Follow%20chrismessina&style=social)](https://github.com/chrismessina)
[![Stars](https://img.shields.io/github/stars/chrismessina/raycast-store-updates?style=social)](https://github.com/chrismessina/raycast-store-updates/stargazers)

**One chronological view of everything happening in the Raycast Store — new extensions, updates to the ones you already have, and the ones that quietly disappeared.**

[Features](#features) • [Requirements](#requirements) • [Quick Start](#quick-start) • [Usage](#usage) • [Development](#development)

</div>

![Raycast Store Updates](media/hero.png)

---

## Features

- **New Extensions Feed** — The latest extensions published to the Store, from Raycast's official JSON feed
- **Extension Updates** — Recently updated extensions, derived from merged PRs in [raycast/extensions](https://github.com/raycast/extensions). A first publish appears in both sources and is deduplicated to one entry
- **Removal Detection** — Extensions pulled from the Store, confirmed by an explicit 404 rather than a guess, so a transient GitHub blip never reports a live extension as gone
- **Changelog Viewer** — Read an extension's changelog inside Raycast, copy just the latest release's notes, or open it on GitHub. ↑/↓ moves between extensions without leaving the changelog
- **My Updates** — Narrow the list to extensions you actually have installed, resolved from your local Raycast install
- **Category & Author Filters** — Stack a single category or a single author on top of the type and platform filters
- **Platform Toggles** — Hide macOS-only or Windows-only extensions. Cross-platform extensions are never hidden by either toggle
- **Read/Unread Tracking** — Optional. Mark items read to keep the list tidy, with "Mark All as Read" and undo
- **Time Grouping** — Today / Yesterday / Previous 7 Days / Previous 30 Days / Earlier
- **Menu Bar Badge** — A background count of what is new since you last looked, scoped to everything or to just your installed extensions

---

## Requirements

- [Raycast](https://www.raycast.com/) installed
- Optionally, a GitHub personal access token. Without one the extension shares GitHub's 60 requests/hour anonymous budget; a classic token with **no scopes** raises that to 5,000

---

## Quick Start

1. Open Raycast and search for **"View Store Updates"**
2. The list loads the Store feed first, then enriches each entry with metadata from GitHub — new extensions appear before updates finish resolving
3. Press <kbd>⏎</kbd> to read an extension's changelog, or <kbd>⌘</kbd><kbd>⏎</kbd> to open it in the Store

To keep an eye on things passively, enable **Store Updates Menu Bar** — it refreshes hourly and badges the count of unseen items.

---

## Usage

### Commands

| Command | Mode | Description |
| --- | --- | --- |
| View Store Updates | `view` | The full chronological list of new, updated, and removed extensions |
| Store Updates Menu Bar | `menu-bar` | A badge of unseen Store activity, refreshed every hour in the background |

### Actions

| Action | Shortcut | Description |
| --- | --- | --- |
| View Changelog | <kbd>⏎</kbd> | Read the extension's changelog inside Raycast |
| Open in Raycast Store | <kbd>⌥</kbd><kbd>⇧</kbd><kbd>⌘</kbd><kbd>O</kbd> | Deep-link straight to the Store page in Raycast |
| Open in Browser | `Common.Open` | Open the Store listing on the web |
| Copy Latest Changes | `Common.Copy` | Copy only the latest release's changelog entry |
| Copy Extension URL | `Common.CopyName` | Copy the Store URL |
| Open Changelog in Browser | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>L</kbd> | Open `CHANGELOG.md` on GitHub |
| Refresh | `Common.Refresh` | Re-fetch the list |
| Check for Extension Updates | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>U</kbd> | Run Raycast's own updater on your installed extensions |
| Show/Hide macOS-only | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>M</kbd> | Toggle platform-exclusive macOS extensions |
| Show/Hide Windows-only | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>W</kbd> | Toggle platform-exclusive Windows extensions |
| Filter by Category | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>F</kbd> | Pick a single category |
| Mark as Read | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>R</kbd> | Requires read tracking to be enabled |
| Mark All as Read | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>A</kbd> | Requires read tracking to be enabled |
| Undo | <kbd>⌘</kbd><kbd>Z</kbd> | Reverse the last read-status change |

Actions listed with a `Common.*` constant use Raycast's system-wide binding for that
semantic, which differs between macOS and Windows — that is the point of the constant, and
why this table names the semantic rather than a key combination.

**Tip:** Hold <kbd>⌥</kbd> and click an item in the menu bar to open its changelog instead of its Store page.

![Menu bar](media/menubar.png)

### Preferences

| Preference | Values | Default |
| --- | --- | --- |
| Read Status | Checkbox — enable read/unread tracking | Off |
| GitHub Token | Password — a classic token with no scopes | Empty |
| GraphQL | Checkbox — fetch pull requests via GraphQL (experimental, requires a token) | Off |
| Menu Bar | All Updates / My Updates (installed only) | All Updates |

---

## Development

### Project Structure

```
raycast-store-updates/
├── src/
│   ├── view-store-updates.tsx      # The main list command
│   ├── store-updates-menu-bar.tsx  # The menu-bar badge
│   ├── components/                 # List items, detail panes, action panels
│   ├── hooks/                      # Read state, filter toggles, changelog, rate limit
│   ├── types/                      # The unified StoreItem shape
│   └── utils/                      # Fetching, slug resolution, caching, GraphQL
├── assets/                         # Extension and platform icons
├── metadata/                       # Store screenshots
├── media/                          # README images
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
| `npm run publish` | Publish to the Raycast Store |

There is no test suite. Verification is `npm run build`, `npm run lint`, and exercising the
commands in `npm run dev`.

### Clone & Run

```sh
git clone https://github.com/chrismessina/raycast-store-updates.git
cd raycast-store-updates
npm install
npm run dev
```

---

## Tech Stack

| Package | Role |
| --- | --- |
| `@raycast/api` | Raycast extension primitives |
| `@raycast/utils` | Higher-level Raycast utilities (`useFetch`, `useCachedPromise`) |
| `@chrismessina/raycast-kit` | House-style failure toasts and count-aware copy |

---

MIT © [Chris Messina](https://github.com/chrismessina)
