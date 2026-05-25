# Dev Servers Changelog

## [Detection and favicon improvements] - 2026-05-25

- Detect any Node tool that runs out of `node_modules/`, not just those launched via `node_modules/.bin/`. Surfaces tools like `serve` and `http-server` that were previously missed.
- Render favicons inline so they display reliably for every framework, including SVG icons and dev servers (such as Astro) that don't expose static assets cross-origin.
- Preserve spaces in detected project paths. Restart, Open in Terminal, and Show in Finder no longer break on projects whose absolute path contains a space.

## [Initial Version] - 2026-05-19

A keyboard-first dashboard for every dev server you have running. Auto-detects servers from any framework that uses `node_modules/.bin/` (Vite, Next.js, Astro, SvelteKit, Nuxt, Webpack, Parcel, Gatsby, Remix, Turbo, esbuild) plus the Bun runtime. Servers are grouped by project with favicons, uptime, framework, and runtime tags.

Actions: open in browser, copy URL, kill, restart, open in terminal, show in Finder, manual refresh, kill all in a project, and kill all globally. Bulk-kill actions ask for confirmation. Restart picks the right package manager from the project's lockfile (npm, pnpm, yarn, bun) and polls until the new server binds a port. Failures surface as toast notifications with a link to the log.
