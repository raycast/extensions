# Dev Servers

A keyboard-first dashboard for every dev server you have running. See them grouped by project, jump into any one in the browser or your terminal, kill stragglers individually or in bulk, and restart with the right package manager, all without leaving Raycast.

## Features

- **Auto-detects** running dev servers including Vite, Next.js, Astro, SvelteKit, Nuxt, Webpack, Parcel, Gatsby, Remix, Turbo, esbuild, serve, http-server, anything that runs out of `node_modules/`, plus servers running on the Bun runtime
- **Custom domain aware** so a dev server fronted by [portless](https://github.com/vercel-labs/portless) shows its named URL (e.g. `myapp.localhost`) as the row title, with the `localhost:PORT` pill alongside for when you still need the raw loopback target
- **Grouped by project** so servers from the same directory appear under one section
- **Worktree-aware** so multiple git worktrees of the same repo collapse into one section, with a per-row branch tag to tell them apart — also surfaces the current branch on single-worktree projects so you can tell which branch a long-running server is on
- **Favicons** — PNG, ICO, or SVG — are pulled from each site (with `/favicon.ico` fallback), inlined so they render even when the dev server isn't CORS-friendly, and cached across refreshes
- **Runtime tag** shows a yellow `bun` badge when the listening process is genuinely running on Bun
- **Uptime tracking** shows how long each server has been running. Hover for the exact start time
- **Smart restart** picks the right package manager (npm, pnpm, yarn, bun) from the project's lockfile, polls until the new server binds a port, and surfaces failures with a link to the log
- **Confirm dialogs on bulk-kill** ensure destructive actions ask first, with a "Don't ask again" option for project-scoped kills
- **Open in your terminal** uses a configurable terminal app preference (Terminal, iTerm, Warp, Ghostty, etc.)
- **Search and filter** by typing a project name, branch, or port into the search bar; a framework dropdown appears when you have multiple frameworks running
- **Stays open** because the window never closes after an action, so you can chain kills and restarts in one session
- **Auto-refresh** updates the list automatically on a configurable interval, plus manual `⌘R`

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Open in Browser | `↵` Enter |
| Open Localhost URL | `⌘` `↵` |
| Kill Server | `⌃` `X` |
| Copy URL | `⌘` `C` |
| Copy Localhost URL | `⌘` `⇧` `C` |
| Restart Server | `⌘` `⇧` `R` |
| Open in Terminal | `⌘` `T` |
| Show in Finder | `⌘` `⇧` `F` |
| Refresh | `⌘` `R` |
| Kill All for Project | `⌃` `⇧` `X` |
| Kill All Servers | `⌃` `⌥` `X` |

## Preferences

- **Terminal App** sets which terminal `⌘T` opens. Defaults to macOS Terminal if unset.
- **Refresh Interval** sets how often to refresh the server list (2s, 5s, 10s, or 30s).
- **Project Display** shows the full directory path in section headers instead of just the project folder name.
- **Row Accessories** independently toggle uptime, the git branch tag, the framework tag, and the `localhost:PORT` pill that appears alongside custom domains.

## How it differs from Port Manager

Port Manager is built around ports. Dev Servers is built around projects.

Port Manager shows every listening process the same way (Postgres, Docker, SSH tunnels, dev servers). Dev Servers shows only the dev servers, groups them by project, identifies the framework, and restarts with the right package manager. The two are complementary.