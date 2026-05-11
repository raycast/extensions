# Azure DevOps Work Items

A Raycast extension to browse, create, and update Azure DevOps work items — without leaving Raycast.

## Features

- **Browse** work items assigned to you across all projects in your organization
- **Filter** by type or project; pick the states and types you care about
- **Group by state** with a custom ordering you control
- **Change state** on a single item or in bulk across many items at once
- **View descriptions** with inline images, plus a separate Attachments section listing every image and file — open any in your system's default viewer
- **Read context** beyond the description: acceptance criteria, repro steps, and comments are all pulled in
- **Create new work items** with title, description, assignee, parent, and optional attachment
- **Create branches** linked to a work item, picking any base branch in any repo across your organization
- **Quick copy** actions for IDs, titles, URLs, branch names, and markdown links

## Setup

### 1. Create a Personal Access Token

Open `https://dev.azure.com/{your-org}/_usersSettings/tokens` and create a new PAT with these scopes:

- **Work Items** — Read & Write
- **Code** — Read & Write (needed for branch creation)

### 2. Enter your credentials

When you first open the extension Raycast will prompt for:

- **Organization** — your org slug (the part after `dev.azure.com/`)
- **Your Email** — the email used in your Azure DevOps profile
- **Personal Access Token** — the PAT from step 1

### 3. Configure your view in-app

On first launch the extension shows a Setup form where you pick:

- **Default Project** — limit the list to a single project, or pick "All projects"
- **States to Show** — which work item states appear in the list (selection order also defines the group order)
- **Types to Show** — which work item types appear
- **Default Repository** — pre-selected when creating a branch
- **Default Base Branch** — branch new branches are created from

You can re-open this Setup any time with `⌘⌥,` from the work items list.

## Keyboard Shortcuts

Shortcuts are scoped per view — the same key always performs the same kind of action in any context. On Windows, Raycast maps `⌘` to `Ctrl` and `⌥` to `Alt` automatically.

| Action | Shortcut |
|---|---|
| **Navigation** | |
| Open work item detail | `↵` |
| Open in Azure DevOps (browser) | `⌘O` |
| Refresh | `⌘R` |
| **State** | |
| Change state of focused item | `⌘⇧S` |
| Change state of all selected items | `⌘⌥S` |
| **Selection** (list view) | |
| Toggle selection on focused item | `⌘T` |
| Select all visible | `⌘⌥A` |
| Clear selection | `⌘⇧A` |
| **Branches** | |
| Create branch linked to work item | `⌘⇧B` |
| Copy branch name | `⌘⌥B` |
| **Copy** | |
| Copy ID | `⌘.` |
| Copy title | `⌘⇧.` |
| Copy URL | `⌘⇧,` |
| Copy as markdown link | `⌘⌥.` |
| **Work item detail** | |
| Open first attachment | `⌘⇧I` |
| **Attachment row** | |
| Open attachment (default) | `↵` |
| Open source URL in browser | `⌘O` |
| Reveal in Finder / Explorer | `⌘⇧F` |
| **App** | |
| New work item | `⌘N` |
| Toggle details sidebar | `⌘⇧D` |
| Open Setup | `⌘⌥,` |

## Notes on State Transitions

Azure DevOps state machines depend on the **process template** (Agile, Scrum, Basic, CMMI) and the **work item type**. The extension fetches the allowed states for each item dynamically, so a Bug in an Agile project will offer New/Active/Resolved/Closed, while a Task in Scrum offers To Do/In Progress/Done. Some transitions are blocked by Azure DevOps rules — if the API rejects a transition, the exact error is shown in the toast.

## Screenshots

_Screenshots to be added before publishing._

## License

MIT
