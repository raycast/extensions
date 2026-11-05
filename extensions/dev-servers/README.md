# Dev Servers

See every dev server running on your Mac, organized by project rather than by port. Kill, restart, open, or start servers without leaving Raycast, and keep a live count in your menu bar. Starting a project whose `node_modules` is gone installs its dependencies first, so a cleaned-up or freshly cloned project still starts in one step. Projects you choose can start on their own after your Mac restarts.

## Commands

- **Dev Servers**: a live dashboard of everything running, grouped by project.
- **Start Dev Server**: spin up a server from a Finder selection, a recent project, or any folder, installing dependencies first if they're missing.
- **Dev Servers Menu Bar**: the running count in your menu bar, with quick actions in the dropdown.

## Dashboard

- Auto-detects Vite, Next.js, SvelteKit, Astro, Nuxt, Webpack, Remix, Wrangler, Shopify CLI, Bun, and anything else running out of `node_modules`
- Also sees servers from outside the JS world: Python (`http.server`, Flask, Django, uvicorn, FastAPI, gunicorn, MkDocs), Ruby (Rails, Puma, Jekyll, WEBrick), PHP (`php -S`, Laravel), Deno, `go run`, `cargo run`, `dotnet run`, Hugo, Caddy, and any script an interpreter runs from a project folder
- Groups servers by project; git worktrees collapse into one section with per-row branch tags
- Kill one server (`⌃X`), a whole project (`⌃⇧X`), or everything (`⌃⌥X`); bulk kills ask first
- Restart (`⌘⇧R`) with the right package manager, detected from the lockfile (npm, pnpm, yarn, bun); a project without a package.json is restarted with the command it was running
- Shows [portless](https://github.com/vercel-labs/portless) custom domains, real favicons, uptime, and framework tags
- Open in browser, editor (`⌘E`), or terminal (`⌘T`); copy the URL, network URL for phone testing (`⌘⌥C`), or port (`⌘⌥P`)
- View any server's startup log (`⌘L`), live-tailed while open
- **Start at Login** (`⌘⇧L`) marks a running project to start after your Mac restarts; marked projects carry a power icon
- Auto-refreshes on your interval; search by project, branch, or port, or narrow the list to one framework

## Start Dev Server

- Works from a Finder selection (multi-folder too), a picker of recently seen projects, or the native folder dialog. Run it straight from Finder and the selection starts right away; reach the picker from the dashboard (`⌘N`) and the same selection waits at the top as **Selected in Finder** until you press `↵`
- Finds the right script automatically: `dev`, `start`, `develop`, then monorepo names like `dev:web`
- Installs missing dependencies for you: a project with no `node_modules` gets one prompt, then an install with its own package manager (at the workspace root in monorepos) and the server start, in one step. Tick "Do not show this again" to make it automatic. The picker tags such projects **Not installed**
- Mark a recent project to start at login (`⌘⇧L`); marked projects carry a power icon
- A **Start at Login** section below the recents lists every marked project and whether it's running
- Shopify support: themes start with `shopify theme dev` (with automatic port fallback when 9292 is taken), app roots with `shopify app dev`, and Hydrogen storefronts through their normal scripts
- A start that never binds a port says so on its row, names the cause when it can (a port in use, a missing command, a failed install), and keeps **View Startup Log** a keystroke away. When installing is the fix, the row offers **Install Dependencies & Start**. A restart that doesn't come back does the same
- First-run note for Shopify: run `shopify theme dev --store <your-store>` once in a terminal so the CLI remembers your store; a background spawn can't answer its login prompt
- Note for portless users: dev scripts wrapped in `portless run` need the portless proxy already running, since a background spawn has no TTY for its sudo prompt. Run `portless service install` once and the proxy starts at boot, so starts keep working after a reboot

## Menu Bar

- Live count of running servers next to the icon (toggleable)
- Each server gets a submenu: open, restart, kill, copy URL or port, editor, terminal
- Projects running several servers get a one-click kill-all item ("Kill Both Servers", "Kill All 3 Servers")
- A **Start** section lists the projects you ran most recently, including ones started from a terminal, or the ones you start most often if you prefer
- Starts hand off to the dashboard, so you can watch the server come up
- Starts the projects marked **Start at Login** after a restart, so keep the menu bar item enabled if you use that

## Preferences

Pick your terminal and editor apps once (shared by all commands), set the dashboard refresh interval and row accessories, choose whether new servers auto-open in the browser, and choose the menu bar count and how its Start section is ordered.
