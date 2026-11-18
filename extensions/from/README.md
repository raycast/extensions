# From

**Capture anything into [Fromly](https://fromly.app/en/) without leaving Raycast.**

Fromly is an outliner that _understands what you write_. You type the way you think — "lunch with Marina tomorrow", "call the bank", "idea for the launch" — and Fromly figures out whether it's a note, a task or an event, dates it and files it under the right context. No menus, no tagging, no friction. This extension brings that same one-keystroke capture to Raycast on macOS.

## Commands

- **Create in From** — Jot down a thought and it lands in today's note. Fromly figures out whether it's a note, task or event, adds the date and applies any `@contexts` from your text — no menus, you just write.
- **Search From** — Full-text search across your whole vault. Open any result in the Mac app or on the web.
- **Open Today's Note** — Jump straight to your daily note.

> **Create** uses Fromly's capture engine via the `from://` deep link and requires the [Fromly Mac app](https://fromly.app/en/). **Search** and **Open Today's Note** work with just the API token.

## Setup

1. In Fromly, go to **Settings → Quick capture → Raycast** and **generate / copy your API token**.
2. Run any From command in Raycast and paste the token into **API Token** when prompted.
3. That's it. (Self-hosting? Change the **Server** field to your own instance.)

The token is a long-lived personal token — the same one Fromly uses for its Claude (MCP) integration. Your notes are only ever sent to your own Fromly server.

## Tips

- Assign a Raycast hotkey to **Create in From** for instant capture from anywhere.
- Use **Open in Browser** to open notes at [fromly.app/app](https://fromly.app/app) when you prefer the web app.

## About Fromly

Fromly is your second brain, on [web](https://fromly.app/app), [Mac](https://fromly.app/en/) and iPhone — fast, private, and built to get out of your way. Learn more at [fromly.app](https://fromly.app/en/).
