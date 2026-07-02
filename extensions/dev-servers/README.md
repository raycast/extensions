# Dev Servers

See every dev server running on your Mac, grouped by project. Kill, restart, open, or start servers without leaving Raycast, and keep a live count in your menu bar.

## Commands

- **Dev Servers**: a live dashboard of everything running, grouped by project.
- **Start Dev Server**: spin up a server from a Finder selection, a recent project, or any folder.
- **Dev Servers Menu Bar**: the running count in your menu bar, with quick actions in the dropdown.

## Dashboard

- Auto-detects Vite, Next.js, SvelteKit, Astro, Nuxt, Webpack, Remix, Shopify CLI, Bun, and anything else running out of `node_modules`
- Groups servers by project; git worktrees collapse into one section with per-row branch tags
- Kill one server (`⌃X`), a whole project (`⌃⇧X`), or everything (`⌃⌥X`); bulk kills ask first
- Restart (`⌘⇧R`) with the right package manager, detected from the lockfile (npm, pnpm, yarn, bun)
- Shows [portless](https://github.com/vercel-labs/portless) custom domains, real favicons, uptime, and framework tags
- Open in browser, editor (`⌘E`), or terminal (`⌘T`); copy the URL, network URL for phone testing (`⌘⌥C`), or port (`⌘⌥P`)
- View any server's startup log (`⌘L`), live-tailed while open
- Auto-refreshes on your interval; search by project, branch, or port

## Start Dev Server

- Works from a Finder selection (multi-folder too), a picker of recently seen projects, or the native folder dialog
- Finds the right script automatically: `dev`, `start`, `develop`, then monorepo names like `dev:web`
- Shopify support: themes start with `shopify theme dev` (with automatic port fallback when 9292 is taken), app roots with `shopify app dev`, and Hydrogen storefronts through their normal scripts
- If a server doesn't bind a port within 15 seconds, the toast escalates with a **View Startup Log** action so you can see what went wrong
- First-run note for Shopify: run `shopify theme dev --store <your-store>` once in a terminal so the CLI remembers your store; a background spawn can't answer its login prompt

## Menu Bar

- Live count of running servers next to the icon (toggleable)
- Each server gets a submenu: open, restart, kill, copy URL or port, editor, terminal
- Projects running several servers get a one-click kill-all item ("Kill Both Servers", "Kill All 3 Servers")
- A **Start** section lists your recent projects, ranked by how often you start them
- Starts hand off to the dashboard so you see the usual progress toast

## Preferences

Pick your terminal and editor apps once (shared by all commands), set the dashboard refresh interval and row accessories, choose whether new servers auto-open in the browser, and toggle the menu bar count.

## How it differs from Port Manager

Port Manager is built around ports; Dev Servers is built around projects. It shows only dev servers, knows their framework and package manager, and can restart or start them. The two are complementary.
