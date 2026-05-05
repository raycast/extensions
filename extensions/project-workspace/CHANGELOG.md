# Project Workspace Changelog

## [Initial Release] - {PR_MERGE_DATE}

### List Projects
- Scan one or more root directories recursively and cache discovered projects locally
- Detect project type, frameworks, languages, Git remotes, and empty directories
- Browse projects in a detail list with framework tags, pinned state, and last-scanned metadata
- Quick-open any project in your default IDE or terminal with a single action
- Override the IDE or terminal per project for Java, Android, or iOS projects that need a specific app
- Edit project name, description, URLs, and pinned state
- Filter by All, Pinned, Archived, and each configured scan root
- Add and manage multiple scan roots without leaving the command
- Archive projects and optionally clean generated build or dependency output to Trash via a preview step

### Running Projects
- Detect active local development servers for all saved project paths
- Show each process with its port, project name (monorepo-aware), and scoped directory path
- Stop a detected process from the action menu after confirmation

### List Issues
- Create and manage issues linked to local projects — no account or internet connection required
- Set status (Backlog, Todo, In Progress, Done, Cancelled), priority, labels, and completion date
- Filter the issue list by status via a search bar dropdown
- Browse issues grouped by status, sorted by priority within each group
- Toggle a detail pane showing issue description, metadata, and full label list
- Create and manage custom labels with colour options

### List Brainstorms
- Capture free-form Markdown brainstorm notes linked to any local project
- Browse notes grouped by project, sorted by most recently updated first
- Toggle a detail pane that renders Markdown content inline
- Generate one or more actionable issues from a brainstorm note using Raycast AI (Raycast Pro required)
