# FMHY Search

Search the FreeMediaHeckYeah (FMHY) wiki database of free resources, websites, and tools directly from Raycast.

This extension parses the official VitePress markdown files from the `fmhy/edit` repository, indexes them locally, and supports fast offline search with custom sorting and filters.

## Features

- **Offline-First Search:** Blazing fast search matching title, description, URL, and category names. Renders up to 200 items for fluid UX performance.
- **Diff-Based Background Sync:** Automatically checks for wiki updates using the GitHub Commit API. If changes are detected, it downloads and re-parses only the modified markdown files (minimizing network usage to <50KB).
- **Split Side-Panel Detail View:** Displays rich details on the right including descriptions, category navigation paths, alternative links, mirrors, and official socials (Discord, Telegram, GitHub) for the selected resource.
- **Recently Opened & Favorites:** Remembers your last 10 clicked or copied items and shows them at the top when the search query is empty.
- **Starred Picks:** Visually highlights community-verified star picks and prioritizes them in sorting. Supports a "Starred Picks Only" filter.
- **Quick Category Prefix:** Jump straight into categories by typing search prefixes (e.g. `/ai generation` or `gaming: emulator` or `v: stream`).
- **NSFW Toggle Preference:** Option to toggle adult/NSFW content visibility from your extension preferences.

## Commands

### Search FMHY
Search and open resources from the FMHY wiki.
* **Filter by Category:** Use the dropdown accessory at the top right of the list to filter by Category.
* **Manual Refresh:** Force a rebuild of the database by pressing `Cmd+Shift+R`.
* **Clear Favorites History:** Clear your recently opened items list with `Cmd+Shift+Delete`.

## Preferences

- **NSFW Content:** Checkbox to allow showing NSFW categories or results. (Default is SFW-only).

## Development and Testing

To run this extension locally:

1. Clone this repository:
   ```bash
   git clone https://github.com/BriskAM/fmhy-raycast.git
   cd fmhy-raycast
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Raycast developer server:
   ```bash
   npm run dev
   ```

## License

This project is licensed under the MIT License.
