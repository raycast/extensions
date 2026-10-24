# Dev Servers

See every dev server running on your Mac, organized by project rather than by port. Kill, restart, open, or start servers without leaving Raycast, and keep a live count in your menu bar.

## Commands

- **Dev Servers**: a live dashboard of everything running, grouped by project.
- **Start Dev Server**: spin up a server from a Finder selection, a recent project, or any folder.
- **Dev Servers Menu Bar**: the running count in your menu bar, with quick actions in the dropdown.

## Dashboard

- Auto-detects Vite, Next.js, SvelteKit, Astro, Nuxt, Webpack, Remix, Wrangler, Shopify CLI, Bun, and anything else running out of `node_modules`
- Groups servers by project; git worktrees collapse into one section with per-row branch tags
- Kill one server (`⌃X`), a whole project (`⌃⇧X`), or everything (`⌃⌥X`); bulk kills ask first
- Restart (`⌘⇧R`) with the right package manager, detected from the lockfile (npm, pnpm, yarn, bun)
- Shows [portless](https://github.com/vercel-labs/portless) custom domains, real favicons, uptime, and framework tags
- Open in browser, editor (`⌘E`), or terminal (`⌘T`); copy the URL, network URL for phone testing (`⌘⌥C`), or port (`⌘⌥P`)
- View any server's startup log (`⌘L`), live-tailed while open
- Auto-refreshes on your interval; search by project, branch, or port, or narrow the list to one framework

## Start Dev Server

- Works from a Finder selection (multi-folder too), a picker of recently seen projects, or the native folder dialog. Run it straight from Finder and the selection starts right away; reach the picker from the dashboard (`⌘N`) and the same selection waits at the top as **Selected in Finder** until you press `↵`
- Finds the right script automatically: `dev`, `start`, `develop`, then monorepo names like `dev:web`
- Shopify support: themes start with `shopify theme dev` (with automatic port fallback when 9292 is taken), app roots with `shopify app dev`, and Hydrogen storefronts through their normal scripts
- A start that never binds a port says so on its row, names the cause when it can, and keeps **View Startup Log** a keystroke away. A restart that doesn't come back does the same
- First-run note for Shopify: run `shopify theme dev --store <your-store>` once in a terminal so the CLI remembers your store; a background spawn can't answer its login prompt
- Note for portless users: dev scripts wrapped in `portless run` need the portless proxy already running, since a background spawn has no TTY for its sudo prompt. Run `portless service install` once and the proxy starts at boot, so starts keep working after a reboot

## Menu Bar

- Live count of running servers next to the icon (toggleable)
- Each server gets a submenu: open, restart, kill, copy URL or port, editor, terminal
- Projects running several servers get a one-click kill-all item ("Kill Both Servers", "Kill All 3 Servers")
- A **Start** section lists your recent projects, ranked by how often you start them
- Starts hand off to the dashboard, so you can watch the server come up

## Preferences

Pick your terminal and editor apps once (shared by all commands), set the dashboard refresh interval and row accessories, choose whether new servers auto-open in the browser, and toggle the menu bar count.
