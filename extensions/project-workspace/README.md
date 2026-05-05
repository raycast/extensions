# Project Workspace

Project Workspace brings your local development workflow into Raycast. It combines a scanned catalog of codebases, monorepo-aware runtime visibility, an offline issue tracker, and Markdown brainstorm notes that can be converted into actionable work with Raycast AI.

## Features

- **Workspace catalog across multiple roots** — Configure one or more scan roots and recursively discover projects. The scanner stops at recognized project roots, so monorepos (Turborepo, Nx, pnpm workspaces, etc.) stay readable instead of expanding into every nested package.
- **Detailed local project intelligence** — Detect frameworks (React, Vue, Next.js, Nuxt, Astro, ...), languages (TypeScript, Python, Go, Rust, ...), Git remotes, empty directories, pinned state, and archived state.
- **Quick Open with per-project overrides** — Open any project in your preferred IDE or terminal with a single keystroke. Set global defaults in preferences and override them when a specific project needs a different toolchain.
- **Running server awareness** — See active dev servers only for the paths already saved in the extension, with ports, scoped paths, and monorepo-aware naming.
- **Offline project planning** — Create and manage issues linked to local projects with status, priority, labels, completion dates, and Markdown descriptions. No account, API key, or network connection required.
- **Brainstorm-to-issue workflow** — Capture Markdown notes for ideas, research, and implementation plans, then use Raycast AI to extract one or more actionable issues from a brainstorm.
- **Local-first storage** — Project cache, issues, brainstorm notes, and labels are stored in Raycast's local support directory. Nothing is sent to an external service unless you explicitly use Raycast AI.

## Commands

### List Projects

Browse and manage the codebases that make up your local workspace.

- Scan one or more root directories and cache results locally for fast subsequent opens
- Discover projects recursively with a bounded depth and stop descending once a project root is identified, which keeps monorepos tidy
- Detect frameworks, languages, and project signals from `package.json`, lock files, `Cargo.toml`, `go.mod`, `pyproject.toml`, and more
- Show each project's Git remote, pinned state, archive status, and scan metadata in the detail pane
- Quick-open into your default IDE or terminal directly from the action panel
- Set a per-project IDE or terminal override when a specific project needs a different app (for example, Android Studio for Android work)
- Edit project display name, description, and associated URLs
- Pin projects to keep frequently used workspaces close at hand
- Archive projects to remove them from the active view without deleting anything
- Clean generated build and dependency directories to Trash via a preview step before confirming
- Add and manage multiple scan roots without leaving the command
- Filter the catalog by All, Pinned, Archived, or a specific scan root

### Running Projects

See which parts of your workspace are actually running right now.

- Detect processes listening on TCP ports and match them to your saved project paths
- Show monorepo-aware names such as `project / app` when a sub-app is running inside a larger workspace
- Display the detected port, project name, and scoped directory path for each server
- Stop any running process directly from the action panel after confirmation
- Jump to List Projects from the empty state if scan roots have not been configured yet

### List Issues

Plan work for your local projects without leaving Raycast.

- Create issues with a title, status, priority, labels, linked project, optional completion date, and a Markdown description
- Use sequential human-readable IDs (`ISS-001`, `ISS-002`, ...) for easy reference
- Organize work with five statuses: **Backlog**, **Todo**, **In Progress**, **Done**, **Cancelled**
- Prioritize with **Urgent**, **High**, **Medium**, **Low**, or No Priority
- Browse issues grouped by status and sorted by priority within each group
- Filter the issue list by status from the search bar dropdown, or search by title, ID, label, or project name
- Toggle a detail pane to see the full Markdown description alongside status, priority, labels, linked project, and timestamps
- Update status and priority directly from submenus without opening the edit form
- Manage custom labels with names and colors
- Let completion dates be set automatically when work moves to Done, or set them manually when needed

### List Brainstorms

Capture ideas before they become structured work.

- Write notes with a title and optional Markdown body for ideas, design sketches, research, or implementation breakdowns
- Link each note to one of your local projects, or keep it project-independent
- Browse notes grouped by project, with groups sorted by most recently updated first
- Toggle a detail pane that renders Markdown inline alongside creation and last-update timestamps
- **Generate Issues with AI** (`⌘⇧G`) to turn a brainstorm note into one or more actionable issues linked to the same project (requires Raycast Pro)

## Setup

**List Projects** requires two preferences before it opens:

1. **Initial Scan Root** — the first directory to scan (e.g., `~/Projects`). Additional roots can be added from the command action panel after setup.
2. **Default IDE** and **Default Terminal** — used by the Quick Open action. Per-project overrides are available from the Edit Project form.

Once **List Projects** is configured, **Running Projects** and **List Issues** automatically share the same saved project paths — no extra setup needed.

## Data Storage

All data is stored locally on your Mac in Raycast's support directory for this extension:

| Data | File |
|---|---|
| Project cache | `projects.json` |
| Issues | `issues.json` |
| Labels | `labels.json` |
| Brainstorm notes | `brainstorms.json` |

Nothing is sent to any external server.
