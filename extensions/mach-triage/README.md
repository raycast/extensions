# Mach Triage — Raycast Extension

Triage your Jira, Linear, and GitHub tickets without leaving Raycast. Search, check your Today board, change status, drop comments, log work — all hitting your local Mach Triage desktop app over localhost. No cloud relay. No token exposure. No bullshit context switching.

## How It Works

This extension talks to a local HTTP bridge running inside the [Mach Triage](https://mach-triage.com) desktop app on your machine. Your issue data never leaves your box through this extension — Raycast sends requests to `127.0.0.1` and gets back what it needs. Provider credentials (Jira OAuth, Linear API keys, GitHub tokens) stay locked in the desktop app's encrypted storage.

## Prerequisites

1. **[Mach Triage](https://mach-triage.com)** desktop app — installed and running
2. **[Raycast](https://raycast.com)** — macOS or Windows (beta)
3. Bridge enabled in Mach Triage Settings

## Setup (30 seconds)

1. Open **Mach Triage → Settings → Raycast Integration → Enable**
2. Click **Generate Token** and copy it
3. In Raycast: **Extensions → Mach Triage → Preferences** → paste the token
4. Run **Mach Triage Status** — should show "Connected"

That's it. If the bridge URL isn't default (`http://127.0.0.1:17847`), paste that too.

## Commands

| Command | What it does |
|---------|-------------|
| **Search Tickets** | Full-text search across your active workspace. Finds by key, title, or description content. |
| **Today Board** | Your Active / Stuck / Next / Done Today lanes — same as the desktop, keyboard-first. |
| **Mach Triage Status** | Health check. Shows version, connection state, and workspace info. |

## Actions (available from any ticket)

| Action | Shortcut | Notes |
|--------|----------|-------|
| View Detail | Enter | Full description, comments, worklogs, metadata |
| Open in Mach Triage | ⌘O | Deep links to the ticket in the desktop app |
| Change Status | ⌘⇧S | To Do, In Progress, Done, Backlog, Canceled |
| Add Comment | ⌘⇧M | Markdown body, optional sync-to-provider toggle |
| Log Work | ⌘⇧W | Hours + minutes, provider-aware (Jira pushes, Linear/GitHub local-only) |
| Copy Key | ⌘C | Copies the issue key to clipboard |

## FAQ

**Why does Mach Triage need to be running?**

Because this extension doesn't talk to Jira/Linear/GitHub directly. It talks to the Mach Triage bridge on your machine, which already has your synced data and credentials. This means zero OAuth setup in Raycast and zero token exposure.

**What providers are supported?**

Whatever you've connected in Mach Triage: Jira, Linear, GitHub, and local-only workspaces. The extension doesn't care — it queries the local database.

**Does my data go to the cloud?**

Not through this extension. Requests go to `127.0.0.1` only. The desktop app handles its own sync to Jira/Linear/GitHub, but that's a separate concern.

**What about Pro features?**

If the desktop app enforces Pro gating on certain features, the bridge returns a `403` and Raycast shows a clear message. No silent failures.

**Can I use this on Windows?**

Yes. Raycast Windows is in beta, and Mach Triage runs on Windows. The bridge works identically on both platforms.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Mach Triage is not reachable" | Launch the desktop app. Bridge only runs when the app is running. |
| "Bridge token rejected" | Regenerate in Settings → Raycast Integration → Generate Token. Paste the new one in Raycast Preferences. |
| "Raycast bridge is disabled" | Settings → Raycast Integration → flip the Enable toggle. |
| Search returns nothing | Check your active workspace has synced tickets. Try "Sync Now" in the desktop app. |
| Worklog says "local only" | Linear and GitHub don't have worklog APIs. Time is tracked locally in Mach Triage. Jira worklogs push normally. |

## Privacy

This extension sends HTTP requests only to your local Mach Triage bridge (`127.0.0.1`). Issue data never routes through Mach Triage cloud services from Raycast. Provider credentials remain exclusively in the desktop app's encrypted storage.

Full policy: https://mach-triage.com/privacy

## License

MIT — see [LICENSE](./LICENSE). The Mach Triage desktop app is proprietary.
