# Packdeck — npm Package Manager

Manage **npm**, **Yarn**, **pnpm**, and **Bun** packages across all your local and global JavaScript and TypeScript projects directly from Raycast.

## Features

- **Search & Discover** — Instant npm registry search with weekly download counts, popularity/quality/maintenance scores, README previews, version history, and changelog links.
- **Install Packages Anywhere** — Install packages globally or into any local project with support for `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies`, specific versions or dist-tags, and exact version pinning.
- **Multi-Package-Manager Support** — Native support for **npm**, **pnpm**, **Yarn**, and **Bun** with automatic lockfile (`bun.lock`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`) and Corepack `packageManager` detection.
- **Project Discovery & Switching** — Automatically discovers local `package.json` projects across your workspace folders, tracks active and pinned projects, and resolves actual installed versions from `node_modules`.
- **Outdated Detection & Bulk Updates** — Compares installed, wanted, and latest versions with Major/Minor/Patch badges and one-key individual or bulk updates.
- **Security Audits & Remediation** — Scans projects via native CLI audits and the npm bulk advisory API (so Bun and lockfile-less projects are covered too), showing severity breakdowns, advisories, and one-click `audit fix`.
- **Keyboard-First Script Runner** — Discovers `package.json` scripts, categorizes them (`dev`, `build`, `test`, `lint`, `typecheck`, etc.), executes short scripts inline with formatted output, or launches interactive/watch scripts in Terminal, iTerm, Warp, Ghostty, Alacritty, or Kitty.
- **Global Package Management** — List, inspect, update, reinstall, install, and uninstall globally installed packages across npm, pnpm, Yarn, and Bun.
- **Favorites & History** — Bookmark frequently used packages and replay or copy past CLI commands.
- **Menu Bar Monitor & Smart Notifications** — Optional macOS menu bar monitor that checks watched projects in the background and alerts you when new vulnerabilities or outdated dependencies appear.

## Commands

| Command | Mode | Description |
| --- | --- | --- |
| **Search npm Packages** | View | Instant registry search, download stats, README & changelog inspection, quick install, and favorites |
| **Manage Projects** | View | Auto-discover local `package.json` projects, switch active workspace, and open the Project Hub |
| **Check Outdated Packages** | View | Inspect Major/Minor/Patch updates per project and run individual or bulk upgrades |
| **Run Security Audit** | View | Detect known vulnerabilities by severity, inspect advisories, and run `audit fix` |
| **Run Project Scripts** | View | Discover and execute `package.json` scripts inline, with custom arguments, or in your terminal |
| **Manage Global Packages** | View | View, update, reinstall, install, and uninstall global packages across npm, pnpm, Yarn, and Bun |
| **Favorites & History** | View | Manage bookmarked packages and replay previous CLI commands |
| **Package Status Menu Bar** | Menu Bar | Background health checks (`30m` interval) with outdated/vulnerability badges and smart notifications |

## Prerequisites

- macOS with [Raycast](https://www.raycast.com/)
- At least one JavaScript package manager installed locally (`npm`, `pnpm`, `yarn`, or `bun`)

Packdeck automatically detects Node and package manager binaries installed via Homebrew, NVM, Volta, fnm, mise, asdf, nodenv, Bun, pnpm, and Yarn. If your binaries live in a custom location, add the directory under **Preferences → Additional PATH Entries**.

## Preferences

- **Project Directories** — Comma-separated workspace folders scanned for `package.json` (defaults to `~/Projects, ~/Developer, ~/Code, ~/Workspace, ~/Sites`). You can also manually add any folder via `⌘N` inside **Manage Projects**.
- **Project Scan Depth** — Maximum folder depth when discovering local projects (`2`–`5`, default `3`).
- **Default Package Manager** — Fallback when no lockfile or `packageManager` field is present (`auto`, `npm`, `pnpm`, `yarn`, `bun`).
- **npm Registry URL** — Custom or private registry URL (defaults to `https://registry.npmjs.org`).
- **Preferred Terminal** — Terminal app for interactive/watch scripts (`Terminal`, `iTerm`, `Warp`, `Ghostty`, `Alacritty`, `Kitty`).
- **Preferred Code Editor** — App used for the **Open in Editor** action on projects.
- **Smart Notifications** — Toggle system notifications for background security/outdated findings and long-running operations.
- **Additional PATH Entries** — Optional colon-separated directories appended to `PATH`.

## Source & License

Open-source under the MIT License — source repository at [github.com/gambadio/packdeck](https://github.com/gambadio/packdeck).
