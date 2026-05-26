# Dev Servers Changelog

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
  
Actions:
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
