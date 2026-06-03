# Create Markdown From

Turn anything into a Markdown (`.md`) file — selected text, the clipboard, or the current browser tab — without leaving Raycast.

## Commands

| Command | What it does |
| --- | --- |
| **Create Markdown From Selection** | Saves the currently selected text as a `.md` file. |
| **Create Markdown From Clipboard** | Smart: if the clipboard holds a URL, the article is fetched and converted to Markdown; if it holds rich content (HTML), formatting and images are kept; otherwise the plain text is saved. |
| **Create Markdown From Current Tab** | Saves the current browser tab as Markdown using the browser's reader view. Requires the [Raycast Browser Extension](https://www.raycast.com/browser-extension). |

Each command opens a quick form with a pre-filled file name (focused, ready to overwrite) and the destination folder. Hit save and you're done.

## Features

- **Configurable default folder** — set it once in preferences; defaults to `~/Desktop`.
- **Remembers your last folder** — change it once and it sticks for next time.
- **Safe saving** — never overwrites; on a name clash it appends ` 2`, ` 3`, … like Finder.
- **Readable names** — pre-filled from the page title or the first line of text, sanitized and trimmed.

## Notes & limitations

- **Selection is plain text.** Raycast's selected-text API returns text only — no images or formatting. To capture images, **copy** the rich content (⌘C) and use *Create Markdown From Clipboard*.
- **Current Tab** talks to whichever browser has the Raycast Browser Extension installed, capturing its active tab.

## Preferences

| Preference | Description |
| --- | --- |
| **Default Folder** | Where new `.md` files are saved by default. Falls back to `~/Desktop` if empty. |
