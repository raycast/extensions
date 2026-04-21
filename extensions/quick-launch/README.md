# Quick Launch

Quick Launch is a Raycast extension for organizing websites, desktop apps, and local tools into custom groups.

## Features

- Create your own groups from scratch
- Add web apps, local apps, files, folders, and executable targets
- Set custom icons per group or app
- Automatically use app icons when possible on macOS and Windows
- Open everything from a single Raycast command

## Example Use Case

Quick Launch works especially well for users who want to access subscription-based AI tools directly from their browser without managing API keys.

Example workflow:

1. Open an AI website such as ChatGPT, Claude, Perplexity, Gemini, or any other service you subscribe to.
2. Add it to a group inside Quick Launch.
3. Keep everything organized by category, such as Writing, Research, Coding, Design, or Agents.

This makes Quick Launch a practical manager for browser-based AI tools you already pay for and use every day.

## Usage

1. Run `Launch Manager` in Raycast.
2. Create a group.
3. Add apps to that group.
4. Use a `Target` such as:
   - `https://chat.openai.com`
   - `/Applications/Slack.app`
   - `C:\Program Files\Notion\Notion.exe`
   - `C:\Users\Ian\Desktop\My Shortcut.lnk`

## Icons

- Extension icon: `assets/icon.png`
- Default app icon fallback: `assets/app-default.png`
- Default group icon fallback: `assets/group-default.PNG`

If you leave the app icon empty, Quick Launch tries to detect a system icon automatically for supported local app targets.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm run build
```
