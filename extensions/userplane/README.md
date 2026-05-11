# Userplane for Raycast

> Create Userplane recording links, browse recordings, and jump into the Userplane dashboard — all without leaving Raycast.

Userplane helps your support team request screen recordings from customers in seconds. The Raycast extension puts every core Userplane workflow behind a keystroke: create a recording link, paste it into Intercom, Zendesk, or Slack, and review the recording — console logs, network activity, user actions — from the same place you launch the rest of your day.

## What you can do

- **Create a recording link** in two keystrokes, copied to your clipboard and ready to send.
- **Browse recordings** in a thumbnail grid with creator, duration, and expiry indicators.
- **Browse recording links** with filters by creator, project, and domain.
- **Jump into the dashboard** for playback, console logs, network activity, and the Issue Analyzer.
- **Menu bar access** so every command is one click away.

## Getting started

1. Create an API key at [dash.userplane.io/\_/account?tab=developers](https://dash.userplane.io/_/account?tab=developers).
2. Run any Userplane command in Raycast.
3. Paste your key into the **API Key** preference when prompted.

Your key is stored in the macOS keychain by Raycast.

## Commands

### Create Recording Link

Pick a workspace, project, and domain, add an optional reference (ticket number, customer ID, anything), and submit. The link is copied to your clipboard. `⌘↵` creates the link and opens it in your browser in one step. The extension remembers your last workspace, project, and domain so the next link is one keystroke faster.

### Browse Recordings

Thumbnail grid of every recording in the current workspace. Filter by creator, project, or link (`⌘F`). Sort by newest or longest (`⌘⇧F` to reset). Recordings nearing expiry are flagged with a clock icon. `⌘C` copies the dashboard URL.

### Browse Links

Every recording link in the current workspace. Filter by creator, project, or domain (`⌘F`, `⌘⇧F` to reset). Copy a link URL, open it in the browser, or jump to the recordings it captured (`⌘R`).

### Show Menu Bar

One-click access to every command plus the dashboard, from the macOS menu bar.

Every command exposes a Userplane action section with Open Dashboard (`⌘D`), View My Recordings (`⌘⇧R`), Change API Key (`⌘⇧K`), and Advanced Options (`⌘⇧A`).

## Self-hosted and staging deployments

Override **API Host** (`apiBaseUrl`, default `api.userplane.io`) and **Dashboard Host** (`dashBaseUrl`, default `dash.userplane.io`) in Extension Preferences. Both accept bare hosts or full `https://` URLs. Every "Open in Dashboard" action respects the dashboard override.

## Learn more

- [Userplane docs](https://docs.userplane.io)
- [Quickstart](https://docs.userplane.io/quickstart)
- [For support agents](https://docs.userplane.io/getting-started/for-support-agents)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local development, build, and publish instructions.

## License

MIT — see [LICENSE](./LICENSE).
