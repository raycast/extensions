# From

**Capture anything into [From](https://getfrom.app) without leaving Raycast.**

From is an outliner that *understands what you write*. You type the way you think — "lunch with Marina tomorrow", "call the bank", "idea for the launch" — and From figures out whether it's a note, a task or an event, dates it and files it under the right context. No menus, no tagging, no friction. This extension brings that same one-keystroke capture to Raycast.

## Commands

- **Create in From** — Jot down a thought and it lands in today's note. Pick note / task / event and an optional date; From does the rest.
- **Search From** — Full-text search across your whole vault. Open any result in the Mac app or on the web.
- **Open Today's Note** — Jump straight to your daily note.

## Setup

1. In From, go to **Settings → Quick capture → Raycast** and **generate / copy your API token**.
2. Run any From command in Raycast and paste the token into **API Token** when prompted.
3. That's it. (Self-hosting? Change the **Server** field to your own instance.)

The token is a long-lived personal token — the same one From uses for its Claude (MCP) integration. Your notes are only ever sent to your own From server.

## Tips

- Assign a Raycast hotkey to **Create in From** for instant capture from anywhere.
- "Open in From (Mac)" uses the `from://` deep link and needs the From Mac app installed. No Mac app? Use "Open in Browser".

## About From

From is your second brain, on web, Mac and iPhone — fast, private, and built to get out of your way. Learn more at [getfrom.app](https://getfrom.app).
