# Things Quick Capture for Raycast

Captures what you're looking at and sends it to Things 3. Like the native Things Helper, but as a Raycast extension.

## Why this exists

I kept running into walls trying to install the official Things Helper app on work machines - IT restrictions, MDM policies, the usual. Homebrew didn't help either. So I made this instead.

## What it does

Point it at something and it grabs the relevant info:

- **Browsers** (Safari, Chrome, Brave, Arc) → page title + URL
- **Mail & Outlook** → email subject + message link
- **Slack & WhatsApp** → conversation name
- **Finder** → file/folder path
- **Notes** → note title + link

Two modes: a form where you can edit everything, or silent mode that just captures and moves on.

## Setup

1. Install from Raycast Store (or `bun run dev` locally)
2. Set your hotkey - I use `⌃⌥Space` to match the native Things shortcut
3. If you live in full-screen apps: use the Silent command and turn off "Show Things Quick Entry" in preferences

## License

MIT
