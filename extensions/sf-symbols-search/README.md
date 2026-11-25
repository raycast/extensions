# SF Symbols Search

Search Apple's SF Symbols by name, tag or description, and copy or paste the symbol or its name.

## Features

- **Apple's own catalog and search.** With SF Symbols 27.2 or later installed, every current symbol, Apple's categories and tags, and per-platform availability come from the app. "delete" finds `trash`, and pasting a glyph finds its name.
- **AI Suggestions.** Descriptive searches like "write with pen" ask Raycast AI for related words and show matching symbols in their own section.
- **Families.** Variants such as `trash`, `trash.fill` and `trash.circle` show as one entry. Show Family lists them all.
- **Grid or list.** View as List (⌘L) adds a sidebar with the code point, family, availability, categories and tags. View as Grid (⌘G) switches back.
- **Rendering modes and weights.** Draw the symbols in Monochrome, Hierarchical or Multicolor, at any weight.
- **Show Info (⌘I).** The symbol in each rendering mode it supports, with availability per mode and platform.
- **Export and Copy Image.** Save a symbol or a whole family as PNG, PDF or the SVG template, or copy it as an image.
- **Pinned and recently used symbols** stay at the top.

## Requirements

- macOS and [Raycast](https://www.raycast.com/)
- [SF Symbols](https://developer.apple.com/sf-symbols/) 27.2 or later for the full catalog, Apple's search, rendering modes, Show Info previews and export. Without it, the extension searches a bundled list of symbols.

## Quick Start

1. Open Raycast and search for **Search SF Symbols**.
2. On first launch with SF Symbols 27.2 installed, the extension renders every symbol image on your Mac. A toast counts the progress; it takes about ten seconds.
3. Type a name or describe the symbol, then press ↵ to copy it.

To open already searching, press Tab after the command name and type a term, or build the search into a quicklink.

## Usage

### Actions

| Action                      | Shortcut      | Description                                                                 |
| --------------------------- | ------------- | --------------------------------------------------------------------------- |
| Copy Symbol                 | `↵`           | Copies the glyph (the primary action follows the Primary Action preference) |
| Show Info                   | `⌘ I`         | The symbol in every rendering mode, with availability                       |
| Show Family                 | `⌘ ⇧ F`       | Every variant of the symbol                                                 |
| Export Symbol               | `⌘ E`         | Saves the symbol in the formats set in preferences                          |
| Export Family               | `⌘ ⇧ E`       | Saves every variant                                                         |
| Copy Image                  | `⌘ ⇧ I`       | Copies the symbol as an image                                               |
| View as List / View as Grid | `⌘ L` / `⌘ G` | Switches the view                                                           |
| Show / Hide Sidebar         | `⌘ ⇧ D`       | In the list                                                                 |
| Rendering Mode…             | `⌘ ⇧ R`       | Monochrome, Hierarchical or Multicolor                                      |
| Weight…                     | `⌘ ⇧ W`       | Ultralight through Black                                                    |
| Pin Symbol                  | `⌘ .`         | Keeps the symbol at the top                                                 |

### Preferences

| Preference              | Values                                        | Default                  |
| ----------------------- | --------------------------------------------- | ------------------------ |
| Primary Action          | Copy or paste the symbol or its name          | Copy Symbol to Clipboard |
| Grid Size               | Small, Medium                                 | Small                    |
| Show Symbol Names       | On, off                                       | On                       |
| Show Minimum OS Version | iOS, macOS, watchOS, tvOS, visionOS, Disabled | Disabled                 |
| Show Recent Symbols     | On, off                                       | On                       |
| AI Suggestions          | On, off                                       | On                       |
| Export Folder           | A folder                                      | `~/Downloads/`           |
| Export Size             | 16 to 1024 pt                                 | 128 pt                   |
| Export Weight           | Ultralight through Black                      | Regular                  |
| Export Rendering Mode   | Monochrome, Hierarchical, Palette, Multicolor | Monochrome               |
| Export Color            | A color name or `#RRGGBB`                     | black                    |
| Export Formats          | PNG, PDF, SVG Template                        | PNG                      |
