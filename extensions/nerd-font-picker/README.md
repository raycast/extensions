<div align="center">

# Nerd Font Picker

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Raycast](https://img.shields.io/badge/Raycast-FF6363?style=flat-square&logo=raycast&logoColor=white)](https://www.raycast.com/)
[![MIT](https://img.shields.io/badge/Licence-MIT-22C55E?style=flat-square)](LICENSE)

**Browse, search, and copy Nerd Font glyphs from your locally installed fonts — entirely offline.**

[Features](#-features) • [Requirements](#-requirements) • [Quick Start](#-quick-start) • [Usage](#-usage) • [Development](#-development)

</div>

---

## Features

- **Instant search** — filter glyphs by name or codepoint (`U+E000`) as you type, with results capped at 200 for snappy performance
- **Live SVG previews** — each glyph is rendered on the fly from the actual font outlines via `opentype.js`; no image assets required
- **Rich detail panel** — shows a large preview alongside name, codepoint, Unicode escape, HTML entity, and the raw glyph character
- **Multiple copy actions** — copy the glyph character, codepoint, name, or Unicode escape sequence, with an option to close Raycast immediately after copying
- **Configurable icon colour** — choose white or black rendering to suit your Raycast theme
- **Local-only, no network** — reads fonts directly from `~/Library/Fonts` and caches metadata in `~/.cache/nerd-font-picker/glyphs.json`; nothing leaves your machine
- **One-command cache refresh** — rebuild the glyph index at any time from the action panel if you install a new font

---

## Requirements

- [Raycast](https://www.raycast.com/) installed
- At least one Nerd Font installed in `~/Library/Fonts` whose filename ends in `NerdFontMono-Regular.ttf` or `NerdFont-Regular.ttf`

Popular choices from [nerdfonts.com](https://www.nerdfonts.com/): JetBrains Mono Nerd Font, FiraCode Nerd Font, Hack Nerd Font. Any variant that ships the standard Nerd Font PUA block (`U+E000`–`U+F8FF`) will work.

---

## Quick Start

1. Open Raycast and search for **"Nerd Font Glyphs"**
2. On first run the extension scans your installed font and writes a cache — this takes a few seconds and shows a progress toast
3. Browse or search the glyph list; the detail panel updates in real time
4. Press `Return` to copy the glyph and close, or open the action panel (`Cmd+K`) for more copy options

---

## Usage

### Searching

Type freely in the search bar to filter by glyph name or codepoint:

| Query    | Matches                                 |
| -------- | --------------------------------------- |
| `arrow`  | All glyphs whose name contains "arrow"  |
| `U+E0A0` | Exact codepoint lookup                  |
| `e0a`    | Partial codepoint match                 |
| `nf-dev` | Name-prefix filtering (Devicons family) |

### Detail Panel

Selecting any glyph opens a split detail view showing:

| Field          | Example            |
| -------------- | ------------------ |
| Name           | `nf-dev-git`       |
| Codepoint      | `U+E0A0`           |
| Unicode Escape | ``                |
| HTML Entity    | `&#xE0A0;`         |
| Glyph          | `` (raw character) |

### Action Panel (`Cmd+K`)

| Action              | Description                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| Copy Glyph & Close  | Copies the raw glyph character and dismisses Raycast                    |
| Copy Glyph          | Copies the raw glyph character and stays open                           |
| Copy Codepoint      | Copies `U+E0A0`                                                         |
| Copy Name           | Copies the glyph name string                                            |
| Copy Unicode Escape | Copies `` (or `\Uxxxxxxxx` for higher planes)                          |
| Refresh Cache       | Re-parses the font and rebuilds `~/.cache/nerd-font-picker/glyphs.json` |

### Preferences

Open Raycast Preferences → Extensions → Nerd Font Picker to configure:

| Preference  | Values       | Default |
| ----------- | ------------ | ------- |
| Icon Colour | White, Black | White   |

---

## Development

### Project Structure

```
nerd-font-picker/
├── src/
│   ├── list.tsx      # Main command — UI, search state, action panel
│   └── utils.ts      # Font parsing, SVG rendering, cache I/O, search logic
├── assets/           # Extension icon (place command-icon.png here)
├── package.json
└── tsconfig.json
```

### Scripts

| Script             | Description                                         |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Start extension in development mode with hot reload |
| `npm run build`    | Build for production (`ray build -e dist`)          |
| `npm run lint`     | Run Raycast ESLint config                           |
| `npm run fix-lint` | Auto-fix lint issues                                |
| `npm run publish`  | Publish to the Raycast Store                        |

### Clone & Run

```sh
git clone https://github.com/raycast/extensions.git
cd extensions/extensions/nerd-font-picker
npm install
npm run dev
```

Then open Raycast and search for "Nerd Font Glyphs".

---

## Tech Stack

| Package                             | Role                                                           |
| ----------------------------------- | -------------------------------------------------------------- |
| `@raycast/api`                      | Raycast extension primitives (List, ActionPanel, Clipboard…)   |
| `@raycast/utils`                    | Higher-level Raycast utilities                                 |
| `opentype.js`                       | Font parsing — reads TTF outlines and extracts PUA glyph paths |
| `typescript`                        | Type-safe source compilation                                   |
| `eslint` + `@raycast/eslint-config` | Linting with Raycast's opinionated ruleset                     |
| `prettier`                          | Code formatting                                                |

---

MIT © [kud](https://github.com/kud) — Made with ❤️
