# Dev Servers Changelog

## [Menu Bar Command] - 2026-07-02

- Adds **Dev Servers Menu Bar**, a compact menu bar command that shows running dev servers by project and keeps the count visible when you want it.
- Each running server gets quick actions for opening, restarting, killing, copying the URL or port, and jumping into your editor or terminal.
- Recent stopped projects appear in a Start section, ranked by use, and hand off to the dashboard so the normal startup toast and progress flow stay intact.
- Projects with two or more servers get a kill-all item at the bottom of their section: "Kill Both Servers" for a pair, "Kill All 3 Servers" beyond. It acts on click without a dialog (menus can't confirm), so the label always names the blast radius and single-server projects don't show it at all.

## [Automatic port fallback for Shopify themes] - 2026-07-02

- **Two copies of a theme now run side by side.** `shopify theme dev` has no next-free-port fallback: when its fixed default port 9292 is taken (say, by the main checkout while you start a git worktree of the same theme), the CLI just dies with `EADDRINUSE` ([Shopify/cli#5554](https://github.com/Shopify/cli/issues/5554)). Starting a theme now probes the default port first and, when it's taken, exports `SHOPIFY_FLAG_PORT` with the next free one. Because it's an environment variable, the fix reaches the CLI through any wrapping — a bare theme root started as `shopify theme dev` and a `dev` script that nests it under `concurrently` both come up on their own port. A `--port` written explicitly into your own script still wins.
- When a spawn dies on a port conflict anyway (a non-Shopify server with a fixed port, or every scanned port taken), the failure toast now says so — "a port is already in use by another process" — instead of the generic "not detected after 15s", and its View Startup Log action opens the log of the server that actually hit the conflict.

## [Shopify support, faster polling, new actions] - 2026-06-10

### Shopify

- Detect running Shopify CLI dev servers launched globally, including `shopify theme dev`, `shopify app dev`, and `shopify hydrogen dev`, so they appear in the dashboard even when the process is outside `node_modules`. Shopify-specific tool tags: Shopify Theme, Shopify App, and Hydrogen.
- **Start Dev Server now works for Shopify themes**, which have no `package.json` at all. A folder containing `layout/theme.liquid` (or `shopify.theme.toml`) resolves as a theme root and starts with `shopify theme dev`; a folder with `shopify.app.toml` and no dev script falls back to `shopify app dev`. Restart on a detected theme server works through the same path. Scaffolded Shopify apps and Hydrogen storefronts already start via their `dev` scripts, so all three project types are now coherent across detect → start → restart.
- The Start picker tags Shopify projects (theme, app, Hydrogen) so they're recognizable among your recents.
- First-run note: the Shopify CLI prompts for login and store selection when it has no remembered state, which a detached spawn can't answer; run `shopify theme dev --store <store>` once in a terminal and the extension starts it cleanly from then on. The captured startup log shows the prompt if this happens.

### Performance

- The portless lookup no longer spawns a zsh login shell (re-sourcing `~/.zshrc`) on every refresh. The portless binary and login PATH are resolved once, persisted in Raycast's cache, and the binary is executed directly from then on: roughly 1s → 100ms per poll on a typical nvm setup, and the dominant cost of every refresh cycle.
- Per-process metadata (working directory, framework, runtime) is now cached for the lifetime of each PID, so steady-state polls skip the second `lsof` query and the tool-detection regexes entirely. Guarded against PID reuse via process start time.
- Git project info is cached per directory and invalidated by the `HEAD` file's mtime (which changes on every checkout, per worktree), replacing a `git rev-parse` spawn per project per poll with a single `stat`.
- Branch switches now show up in the dashboard immediately: the change-detection that skips redundant re-renders compares branches too, instead of waiting for a PID change.

### New actions and preferences

- **Open in Editor** (`⌘E`): a new shared **Editor App** preference (VS Code, Cursor, Zed, …) adds an Open in Editor action to dashboard rows and recent-project rows. Hidden until the preference is set.
- **Copy Network URL** (`⌘⌥C`): when a server is bound beyond loopback and your Mac has a LAN address, copy `http://<lan-ip>:<port>` for testing on a phone or another machine. Only offered when the server is actually reachable that way.
- **Copy Port** (`⌘⌥P`): copy just the port number, for env files and config.
- The startup log view now follows the file while open (live tail every 2s), so a slow boot or crash loop streams in without mashing refresh.

## [Start Dev Server] - 2026-06-01

Adds a `Start Dev Server` command for spinning up dev servers without leaving Raycast. Works from a Finder selection, from a list of recently-seen projects, or from a native folder picker.

### Start Dev Server

- **From Finder**: select a project folder (or any file inside one) and run **Start Dev Server**. The extension walks up to the nearest `package.json`, detects the package manager (npm / pnpm / yarn / bun), picks the right script, and spawns it with the same PATH-aware login-shell pattern used by Restart. The dashboard opens immediately and shows a "Starting…" toast that transitions to "X is running" the moment the server binds a port.
- **From recents**: run the command with nothing selected in Finder and you get a picker over the projects the extension has seen running recently. Recents auto-populate from the dashboard's polling loop, with no explicit bookmarking. LRU-bounded at 30 entries. Running projects are hidden from this list (they live in the dashboard); they reappear once stopped.
- **From anywhere**: the picker also exposes a **Choose Folder…** entry that opens the native macOS folder dialog directly, with no intermediate screen.
- **From the dashboard**: the empty state offers a primary **Start Dev Server** action (just press `↵` from a fresh dashboard to land in the picker). Each running-server row's action panel also carries `Start Dev Server` (`⌘N`), so spinning up another project never requires bouncing back to root search.
- Each picker row shows last-seen, git branch when applicable, and a framework tag inferred from `package.json` dependencies. Cached favicons appear inline once the dashboard has seen the project running, so even stopped projects keep their real icon. Per-row actions: Start, Open in Terminal (`⌘T`), Show in Finder (`⌘⇧F`), Copy Path (`⌘C`), Remove from Recents (`⌃X`).
- Folders that no longer exist on disk are hidden this render but kept in storage so they reappear when (for example) an external drive remounts.
- **Startup logs**: every spawned server's stdout+stderr is captured to a per-project log. If a server doesn't bind a port within 15s, the toast escalates to a failure with a **View Startup Log** action instead of silently disappearing, so a misconfigured or custom setup (e.g. portless needing sudo, a missing binary, a crashing build) is diagnosable from inside Raycast. Every running-server row also carries a **View Startup Log** action (`⌘L`) for inspecting output on demand.

### Behavior

- Script picker tries `dev` → `start` → `develop` first, then scans script values for known dev-server tools (Vite, Next, Astro, Nuxt, Webpack, Parcel, Gatsby, Remix, Turbo, Bun watch/hot, nodemon, tsx watch, ts-node-dev, serve, http-server, live-server). Monorepo conventions like `dev:web` and `start:dev` resolve out of the box.
- Already running on that folder? You get one consolidated alert: `X is already running. Restart?` for a single target, `All 3 already running. Restart them?` when every selected folder is running, or `2 of 3 already running. Restart these, then start the other one?` for the mixed case. No more N-alert cascades for N-folder selections.
- The Finder selection is only honored when Finder is the frontmost app. Previously a folder selected earlier (to start one server) lingered in Finder's selection, so running the command later from another app, e.g. the browser, would silently treat that stale folder as the target and surface a spurious `already running. Restart?`. Now, unless you're actually in Finder, the command goes straight to the recents picker, where you can start whatever project you meant.
- After a server is started (from Finder, the picker, or a recent), the dashboard moves the selection onto that new row, so pressing `↵` acts on the server you just launched rather than re-opening whatever was previously selected. Restart (`⌘⇧R`) likewise re-focuses the replacement once it binds.
- Multi-folder selection prompts for confirmation by default, useful for monorepo siblings or a "frontend + backend" startup, with an opt-out preference for users who do this regularly.
- New **Open in browser when the port binds** preference auto-opens the URL once the new server starts listening. Off by default; a one-time hint surfaces it in the in-flight toast for the first few starts.

### Under the hood

- The dashboard is the controller for the entire spawn flow. The launching command resolves a target list and hands off via `launchContext`, which lets the user land on the dashboard immediately and watch the spawn happen there, rather than waiting on a blank loading view for a pre-spawn `fetchServers` call.
- Spawn lifecycle is a clean state machine on the dashboard: `idle → pending → confirming → spawning → done`. The "Starting…" toast lives on the dashboard so it's visible the whole time the user is waiting, and transitions to a green "running" state the moment every expected cwd appears in the polling loop.
- All filesystem paths flow through `canonicalCwd` (a `realpathSync` wrapper) so symlinked project paths compare equal between Finder selections, the recents store, and `lsof`'s view of running processes.
- Extracted `startDevServer(cwd)` and `killServer(pid)` so the new command and the existing restart flow share one spawn path. Restart is now `killServer + startDevServer`.
- The spawn passes the package manager and chosen script as separate arguments rather than building a shell string, so projects with unusual script names (spaces, punctuation) start reliably and the launch surface stays free of shell-interpolation surprises.
- Shared `tool-display.ts` so the framework tag styling stays consistent across the dashboard and the picker.
- Favicons cached onto recents for stopped-project icons are size-capped, keeping the recents store small; the live dashboard always renders the real favicon regardless.

### Preferences

- **Terminal App** is now a single shared preference that applies to both **Dev Servers** and **Start Dev Server**: set the terminal `⌘T` opens once, and both commands honor it.

## [Portless & Shortcuts] - 2026-05-26

Surfaces custom local domains from [portless](https://github.com/vercel-labs/portless), and tightens the action panel, shortcuts, and preferences to align with Raycast conventions.

### Custom domain detection

- Detect custom local domains via portless and show the named URL (e.g. `myapp.localhost`) as the row title instead of `localhost:PORT`. The `localhost:PORT` pill stays visible alongside it, since the raw loopback target is still useful for env files, OAuth allowlists, CORS rules, and anything that doesn't trust the local CA.
- "Open in Browser" and "Copy URL" target the custom domain when one is present. New "Open Localhost URL" and "Copy Localhost URL" actions target loopback explicitly.
- Search the list by custom domain: typing "myapp" surfaces `https://myapp.localhost`.
- New "Show localhost URL with custom domain" preference, for users who'd rather hide the `localhost:PORT` pill once a named domain is in place.
- Filter out the portless proxy daemon itself so it never appears as a phantom dev server row.

### Action panel and shortcuts

- Kill Server's shortcut moves from `⌘D` to `⌃X`. `⌘D` is officially "Duplicate" in Raycast's keyboard conventions; `⌃X` is "Remove". Kill All for Project and Kill All Servers shift to `⌃⇧X` and `⌃⌥X` to stay in the same family.
- Copy Localhost URL is bound to `⌘⇧C`, mirroring `⌘C` for Copy URL.
- Action panel reordered: Restart Server now sits at position 3, above Kill Server. Restarting is the more common mutation (iterate-on-change), and placing it above Kill also means Raycast's reserved `⌘↵` second-action shortcut never auto-fires Kill. It falls through to Open Localhost URL when a custom domain is present, or to Restart otherwise. Both are safe.

### Preferences

- Refresh Interval (a behavior setting) moves above Project Display (cosmetic), so settings that change what the extension *does* appear before settings that change how it *looks*.

## [Worktree grouping and detection rewrite] - 2026-05-26

3x faster, windows port preparation, support for git branches & worktrees, search by project and branch.

- Rewrote process detection from an embedded shell pipeline to TypeScript. Output is unchanged; the new path is roughly 3x faster, removes a class of shell-parsing bugs, and lays the groundwork for a future Windows port.
- Group multiple git worktrees of the same repo into one project section. Each row shows its current branch next to the link, and per-row actions (Open in Terminal, Show in Finder) still target the specific worktree on disk.
- Show the current git branch on every project's rows, so you can tell at a glance which branch a long-running dev server is on, even for single-worktree projects.
- Search by project name or branch directly in the Raycast search bar, Raycast's built-in filter previously only matched the port number and subtitle.
- New preferences to toggle each row accessory (uptime, git branch, framework tag) independently.
- Stylized framework names (SvelteKit, Astro, Next.js, esbuild, etc.) in the row tag and the filter dropdown.
- More reliable restarts: the old process is force-killed and confirmed exited before the replacement spawns, closing a rare race where the new server could fail to bind because the old one still held the port.

## [Detection and favicon improvements] - 2026-05-25

Detects more dev-server tools, renders favicons reliably across frameworks, and handles project paths that contain spaces.

- Detect any Node tool that runs out of `node_modules/`, not just those launched via `node_modules/.bin/`. Surfaces tools like `serve` and `http-server` that were previously missed.
- Render favicons inline so they display reliably for every framework, including SVG icons and dev servers (such as Astro) that don't expose static assets cross-origin.
- Preserve spaces in detected project paths. Restart, Open in Terminal, and Show in Finder no longer break on projects whose absolute path contains a space.

## [Initial Version] - 2026-05-19

Dashboard for every running dev server, grouped by project.

- A keyboard-first dashboard for every dev server you have running.
- Auto-detects servers from any framework that uses `node_modules/` (Vite, Next.js, Astro, SvelteKit, Nuxt, Webpack, Parcel, Gatsby, Remix, Turbo, esbuild) plus the Bun runtime.
- Servers are grouped by project with favicons, uptime, framework, and runtime tags.
  
### Actions:
- Open in browser
- Copy URL
- Kill
- Restart
- Open in terminal
- Show in Finder
- Manual refresh
- Kill all in a project
- Kill all globally. 
- Bulk-kill actions ask for confirmation.
- Restart picks the right package manager from the project's lockfile (npm, pnpm, yarn, bun) and polls until the new server binds a port.
- Failures surface as toast notifications with a link to the log.
