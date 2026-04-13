# Lattice Scholar

[中文文档](README.zh-CN.md)

Search your [Lattice](https://stringer07.github.io/Lattice_release/) literature library directly from Raycast — no switching apps, no context loss.

## Features

- **Instant search** across your entire Lattice library as you type
- **Full citation details** — authors, journal, DOI, year, and more
- **Copy actions** — copy citekey, title, DOI, or full BibTeX with one keystroke

## Screenshots

![Search results list](assets/item.png)

![List item actions](assets/item-action.png)

![Paper detail view](assets/detail.png)

![Detail view actions](assets/detail-action.png)

## Requirements

- [Lattice](https://stringer07.github.io/Lattice_release/) desktop app must be running
- The local API is served at `http://127.0.0.1:52731` by default — configurable in extension preferences

## Preferences

Open Raycast Preferences (`⌘ ,` → Extensions → Lattice Scholar Extension) to configure:

- **API Port** — port number for the Lattice local API (default: `52731`)

![Preferences](assets/preferences.png)

## Usage

1. Open Raycast and run **Lattice Search**
2. Type any part of a title, author, or keyword
3. Press `↵` to open the detail view, or use the action panel (`⌘ K`) to copy citation data

## Tips: Alias & Hotkey

For faster access, assign an alias or hotkey to the **Search Literature** command in Raycast Preferences (`⌘ ,` → Extensions → Lattice Scholar Extension).

- **Alias** — type a short keyword (e.g. `las`) to launch the command without scrolling through the list
- **Hotkey** — bind a global shortcut (e.g. `⌥ ⌘ L`) to open the search from anywhere

![Alias and hotkey setup](assets/alias_and_hotkey.png)
