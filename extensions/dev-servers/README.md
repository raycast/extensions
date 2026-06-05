# Dev Servers

A keyboard-first way to manage and start your local dev servers from Raycast. See everything running grouped by project, jump into any one in the browser or your terminal, kill stragglers individually or in bulk, restart with the right package manager, and spin up a new server from a Finder selection or a recent project, all without leaving Raycast.

## Commands

- **Dev Servers**: the dashboard. A live, auto-refreshing list of every dev server currently running, grouped by project.
- **Start Dev Server**: spin up a server from a Finder selection, a recently-seen project, or any folder you pick. The dashboard opens and shows it coming up.

## Dev Servers (dashboard)

- **Auto-detects** running dev servers including Vite, Next.js, Astro, SvelteKit, Nuxt, Webpack, Parcel, Gatsby, Remix, Turbo, esbuild, serve, http-server, anything that runs out of `node_modules/`, plus servers running on the Bun runtime
- **Custom domain aware** so a dev server fronted by [portless](https://github.com/vercel-labs/portless) shows its named URL (e.g. `myapp.localhost`) as the row title, with the `localhost:PORT` pill alongside for when you still need the raw loopback target
- **Grouped by project** so servers from the same directory appear under one section
- **Worktree-aware** so multiple git worktrees of the same repo collapse into one section, with a per-row branch tag to tell them apart. It also surfaces the current branch on single-worktree projects so you can tell which branch a long-running server is on
- **Favicons** (PNG, ICO, or SVG) are pulled from each site (with `/favicon.ico` fallback), inlined so they render even when the dev server isn't CORS-friendly, and cached across refreshes
- **Runtime tag** shows a yellow `bun` badge when the listening process is genuinely running on Bun
- **Uptime tracking** shows how long each server has been running. Hover for the exact start time
- **Smart restart** picks the right package manager (npm, pnpm, yarn, bun) from the project's lockfile, polls until the new server binds a port, and surfaces failures with a link to the log
- **Start another server** without leaving the dashboard: `⌘N` from any row, or `↵` from the empty state, opens the Start Dev Server picker
- **View startup logs** with `⌘L` on any row, so you can inspect a server's captured stdout/stderr on demand
- **Confirm dialogs on bulk-kill** ensure destructive actions ask first, with a "Don't ask again" option for project-scoped kills
- **Open in your terminal** uses a configurable terminal app preference (Terminal, iTerm, Warp, Ghostty, etc.)
- **Search and filter** by typing a project name, branch, or port into the search bar; a framework dropdown appears when you have multiple frameworks running
- **Stays open** because the window never closes after an action, so you can chain kills and restarts in one session
- **Auto-refresh** updates the list automatically on a configurable interval, plus manual `⌘R`

## Start Dev Server

Spin up a dev server without opening a terminal. There are three ways in:

- **From Finder**: select a project folder (or any file inside one) and run the command. It walks up to the nearest `package.json`, detects the package manager, picks the right dev script, and starts it. Select several folders to start them together (monorepo siblings, a "frontend + backend" pair). The dashboard opens immediately and a "Starting…" toast tracks each one until it binds a port.
- **From recents**: run the command with nothing selected and you get a picker over projects the extension has recently seen running. Recents populate automatically from the dashboard, with no bookmarking. Each row shows last-seen time, git branch, a framework tag, and the project's real favicon once it's been seen running. Currently-running projects are hidden here (they live in the dashboard) and reappear once stopped.
- **From anywhere**: the picker's **Choose Folder…** entry opens the native macOS folder dialog directly, for a one-off project that isn't in your recents.

If a target is already running, you get a single consolidated prompt to restart it (or restart the running ones and start the rest) rather than a cascade of dialogs. If a server doesn't bind a port within 15 seconds, the toast escalates to a failure with a **View Startup Log** action so a misconfigured setup is diagnosable in place.

The script picker tries `dev` → `start` → `develop` first, then scans script values for known dev-server tools, so monorepo conventions like `dev:web` and `start:dev` resolve out of the box.

**Picker row actions:** Start (`↵`), Open in Terminal (`⌘T`), Show in Finder (`⌘⇧F`), Copy Path (`⌘C`), Remove from Recents (`⌃X`).

## Keyboard Shortcuts

Dashboard (Dev Servers):

| Action | Shortcut |
|---|---|
| Open in Browser | `↵` Enter |
| Open Localhost URL | `⌘` `↵` |
| Restart Server | `⌘` `⇧` `R` |
| Kill Server | `⌃` `X` |
| Copy URL | `⌘` `C` |
| Copy Localhost URL | `⌘` `⇧` `C` |
| Open in Terminal | `⌘` `T` |
| Show in Finder | `⌘` `⇧` `F` |
| Start Dev Server | `⌘` `N` |
| View Startup Log | `⌘` `L` |
| Refresh | `⌘` `R` |
| Kill All for Project | `⌃` `⇧` `X` |
| Kill All Servers | `⌃` `⌥` `X` |

## Preferences

**Shared**

- **Terminal App** sets which terminal `⌘T` opens, for both commands. Defaults to macOS Terminal if unset.

**Dev Servers**

- **Refresh Interval** sets how often to refresh the server list (2s, 5s, 10s, or 30s).
- **Project Display** shows the full directory path in section headers instead of just the project folder name.
- **Row Accessories** independently toggle uptime, the git branch tag, the framework tag, and the `localhost:PORT` pill that appears alongside custom domains.

**Start Dev Server**

- **Open in browser when the port binds** auto-opens each new server's URL once it starts listening. Off by default.
- **Confirm when starting multiple folders at once** asks before spawning more than one server from a multi-folder Finder selection. On by default.

## How it differs from Port Manager

Port Manager is built around ports. Dev Servers is built around projects.

Port Manager shows every listening process the same way (Postgres, Docker, SSH tunnels, dev servers). Dev Servers shows only the dev servers, groups them by project, identifies the framework, restarts with the right package manager, and can start new ones for you. The two are complementary.
