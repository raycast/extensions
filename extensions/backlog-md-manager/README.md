# Backlog.md Manager

Manage your [Backlog.md](https://www.npmjs.com/package/backlog.md) tasks directly from Raycast. Browse, create, search, edit, and change task status across multiple projects without leaving Raycast.

## Prerequisites

- **Backlog.md CLI** — install via `npm install -g backlog.md`
- At least one project initialized with `backlog init`

## Setup

On first launch, you'll be prompted to configure two preferences:

- **Project Directories** — comma-separated absolute paths to your Backlog.md projects (e.g. `/Users/you/Dev/ProjectA, /Users/you/Dev/ProjectB`). Tilde paths like `~/Dev/ProjectA` are also supported.
- **Backlog CLI Path** — absolute path to the `backlog` binary. Defaults to `/opt/homebrew/bin/backlog`. If you installed via npm globally, you can find it with `which backlog`.

## Commands

### List Tasks

Browse all tasks grouped by status (To Do, In Progress, Done, Blocked). Use the action panel to filter by status or priority. If you have multiple projects configured, switch between them with the dropdown in the search bar.

| Shortcut | Action                   |
| -------- | ------------------------ |
| `↵`      | View task details        |
| `⇧⌘S`    | Start task (In Progress) |
| `⇧⌘D`    | Complete task (Done)     |
| `⌘R`     | Refresh list             |

### Create Task

Full-featured task creation form supporting all `backlog task create` options:

- Title, description, priority, labels, assignee
- Draft mode, parent task, and dependencies
- Acceptance criteria — press `⌘A` to add more fields
- Definition of Done — press `⌘D` to add more fields
- References and documentation links — press `⌘R` / `⇧⌘D` to add more
- File attachments via drag and drop (added as `--ref`)

### Search Tasks

Full-text search powered by the Backlog.md index. Results are ranked by relevance and show status and priority at a glance. Press `↵` to view full task details.

## Multi-Project Support

Configure multiple project paths in preferences. The extension remembers your last selected project across launches using Raycast's persistent cache. Switch projects from the dropdown in the search bar (List/Search) or the form dropdown (Create).
