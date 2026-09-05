# Markdown Preview Clean

A distraction-free Markdown preview for Raycast — **no sidebar**.

Inspired by [xjo_nd/markdown-preview](https://www.raycast.com/xjo_nd/markdown-preview), rewritten without the `Detail.Metadata` panel.

## Install into Raycast (local development)

1. Make sure [Raycast](https://www.raycast.com/) is installed and running.
2. In this folder:

```bash
npm install
npm run dev
```

3. `ray develop` will build the extension and **Import** it into Raycast automatically.
4. Open Raycast (Cmd+Space) and search for:
   - **Preview Markdown**
   - **Preview Clipboard Markdown**
   - **Markdown History**

Leave `npm run dev` running while you iterate; edits hot-reload.

### One-time / production-style local install

```bash
npm install
npm run build
```

Then in Raycast open **Import Extension** and pick this folder
(Command Palette: search "Import Extension").

To remove later: Raycast → Extensions → Markdown Preview Clean → Uninstall.

## Commands

| Command                        | Description                                             |
| ------------------------------ | ------------------------------------------------------- |
| **Preview Markdown**           | Editor to full-width preview                            |
| **Preview Clipboard Markdown** | Clipboard text, copied .md file, or absolute path       |
| **Preview Markdown File**      | Finder selection / copied file / path (best for images) |
| **Markdown History**           | Browse / search / re-open past previews (max 50)        |

Every successful preview is saved to history (duplicates bubble to the top).

### Share (mdshare)

In any preview: **Share via mdshare** (`Cmd+Shift+S`).

- No login
- Uploads markdown, creates a **view-only** link, copies it
- Toast can open the link or copy the private admin URL
- Content is public to anyone with the link (90-day expiry on mdshare)
- Relative local images are **not** uploaded (text-only share)

## Shortcuts

### Editor

| Shortcut    | Action               |
| ----------- | -------------------- |
| Cmd+Enter   | Preview              |
| Cmd+V       | Paste from clipboard |
| Cmd+Y       | Open history         |
| Cmd+Shift+K | Clear editor         |

### Preview

| Shortcut      | Action                                                 |
| ------------- | ------------------------------------------------------ |
| Cmd+O         | Open in Browser (Mermaid / KaTeX / highlight / images) |
| Cmd+Shift+S   | Share via mdshare (copy view link)                     |
| Cmd+Backspace | Back                                                   |
| Cmd+C         | Copy Markdown                                          |
| Cmd+Shift+C   | Copy HTML                                              |
| Cmd+I         | Show stats (toast)                                     |

Browser preview writes a temp HTML file and opens it in your default browser.

Browser preview also includes:

- Auto / Light / Dark themes with matching syntax colors
- Copy buttons for code blocks and anchor links for headings
- Click-to-zoom images, local relative images, and Obsidian `![[image.png]]` embeds
- GitHub-style task lists
- Mermaid diagrams, KaTeX math, and syntax highlighting loaded only when needed

The enhanced features use pinned jsDelivr assets, so their first use needs a network connection. If an asset fails to load, the browser toolbar shows a warning.

### History

| Shortcut            | Action            |
| ------------------- | ----------------- |
| Enter               | Preview item      |
| Cmd+C               | Copy Markdown     |
| Cmd+Backspace       | Delete item       |
| Cmd+Shift+Backspace | Clear all history |

## Develop

```bash
npm run dev
npm run build
npm run lint
```
