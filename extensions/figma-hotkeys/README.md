# Figma Hotkeys

A [Raycast](https://raycast.com) extension for Windows and macOS that displays Figma keyboard shortcuts and lets you search and copy them quickly. Yes, I realize that Figma has a built-in shortcuts panel, but I wanted the ability to search them. Was this necessary? No. Could it save people a few seconds? Yes.

## Features

- **Searchable list** – Fuzzy search by action name, shortcut, or category
- **Grouped by category** – Canvas, Selection, Layers, Design, View, Tools, Text, Comments, General
- **Copy shortcut** – Copy the shortcut to the clipboard
- **Open official help** – Quick link to Figma’s keyboard shortcuts documentation

## Setup

1. Install [Raycast](https://raycast.com).
2. Clone or download this repo.
3. In the extension folder run:
   ```bash
   npm install
   npm run dev
   ```
4. In Raycast, run **Figma Hotkeys** (or search for “Figma”).

## Development

- `npm run dev` – Start development mode with hot reload
- `npm run build` – Production build
- `npm run lint` – Run ESLint

## References

- [Figma – Keyboard shortcuts](https://help.figma.com/hc/en-us/articles/360040328653)
- [Raycast Extensions (Windows)](https://manual.raycast.com/windows/build-your-own-extensions)
