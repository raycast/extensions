# Plane Changelog

## [Feature Pack: My Work Items, Open by ID, Menu Bar, Cycles, Modules, Intake, Comments, AI Tools] - {PR_MERGE_DATE}

### Fixed

- **Self-hosted base URLs**: trailing slashes (and an accidental `/api` or `/api/v1`) in API Base Path / App Base URL no longer cause `//api/v1/...` 404s
- **Errors are shown**: lists show what went wrong (401/403 → check your API key, 404 → check API Base Path) with "Open Extension Preferences" and "Retry" actions instead of an empty list
- **API key errors say what's wrong**: Plane's reason is shown (an invalid or expired key now reads "API key not valid" instead of a generic 403), and a pasted key's stray spaces or newline are trimmed
- Lists no longer show a second error toast on top of the error screen
- The menu bar and My Work Items no longer run the project scan at the same time; the second one waits for the first one's result, and a background menu bar refresh reuses a result from the last 5 minutes
- **Start and due dates** keep the day you picked: east of UTC, the form used to save the previous day
- **Search Work Items** no longer sends a request for an empty query
- **Search Projects → Work Items**: stable keys, `PROJ-12` identifiers, and full row actions
- The API key is no longer part of the LocalStorage key name (now a SHA-256 hash; the old key is migrated once)

### Added

- **Change Workspace** (⌘⇧W) in every list: type a new slug (API key) or pick any workspace that installed the app (OAuth)
- **My Work Items**: assigned to me / created by me, grouped by state (Triage → In Progress → Todo → Backlog), completed and cancelled behind ⌘⇧H
- **Open Work Item**: open `ENG-123` or a Plane URL from the argument or clipboard
- **Quick Create Work Item** (no-view, default project and assign-to-me preferences) and **Quick Add Comment** (no-view, Markdown)
- **Assigned Work Items** menu bar command with the count of open assigned work items; hold ⌥ to open in the browser
- **My Open Work Items**: your open assigned count, with urgent, overdue and due-today counts, in root search, refreshed every 15 minutes; opening it shows My Work Items
- **Active Cycles** with progress, **Search Modules**, and **Intake** (accept, decline, snooze, mark as duplicate)
- **Search Pages** (Plane Cloud; Community Edition has no public pages API and says so)
- Row actions everywhere: open detail, open in browser, copy identifier / URL / Markdown link, update state and priority (optimistic), assign to me, add comment, edit
- Work item detail shows assignees, labels, cycle, module, created/updated dates, and the latest comments
- AI tools: list projects, search, get, list my work items, create, update, comment, list states, list members, get current user
- **Faster My Work Items**: uses Plane API v2 (`assignee_id`) on Cloud and Commercial, or server-side v1 filters on servers that advertise `X-Plane-Work-Item-Filters: 1`, and falls back to the project scan otherwise. Detection is cached per server and workspace (24 hours when supported, 1 hour when not) and never shows an error; the active backend appears in the list's section subtitle and the menu bar tooltip
- **Subscribed** and **Mentions** views in My Work Items and the `list-my-work-items` AI tool, on servers with server-side filters
- **Search Pages** uses the API v2 pages endpoints when the server has v2
- API v2 errors (RFC 9457 problem+json) show their detail and field errors; rate-limited GETs wait out a short `Retry-After` once, and longer waits are reported

## [Show State Color in Search Projects > Work Items] - 2026-01-23

- In "Search Projects" > "Work Items", the `Icon` is colored and has `tooltip` of the _state_ name

## [Add Start Date and Due Date to Work Item Creation and Editing] - 2026-01-17

## [Update README with correct API Base Path format] - 2025-11-04

## [Add API Key Authentication and Support for Self-Hosted Plane Instances] - 2025-11-04

- **API Key Authentication**
- **Support for Self-Hosted Plane Instances**

## [Fix README] - 2025-10-31

## [Cycle and Member Filtering Improvements] - 2025-10-15

## Enhanced

- **Filter Cycles**: Show only active cycles (end date in the future)
- **Filter Members**: Exclude bot and intake email addresses from member lists
- **Terminology**: Changed "issue" to "work item" for consistency

## [Fix Issue in getProjectIcon] - 2025-10-13

### Fixed

- `getProjectIcon`: Extension was crashing due to different response in project logo (ref: [Issue #22144](https://github.com/raycast/extensions/issues/22144))

## [Search Projects + Filter Work Items] - 2025-10-13

### Added

- **Search Projects**: Ability to view projects and their work items (ref: [Issue #22093](https://github.com/raycast/extensions/issues/22093))

### Enhanced

- **Filter Work Items**: Enhanced command allowing user to filter by project

## [Initial Version] - 2025-10-09

### Added

- **Create Work Items**: Ability to create new work items with title, description, and assignee
- **Search Work Items**: Search functionality to find work items across projects and workspaces
- **View Work Item Details**: Detailed view of work items with all relevant information
- **Work Item Actions**: Context menu actions for work items including edit work item, status and priority updates
- **Authentication**: Secure authentication with Plane API
