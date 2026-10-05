# Changelog

## [Initial Version] - 2026-06-04

### Added

- **Search Workflows Command**
  - Live search by workflow ID or type
  - Filter workflows by execution status
  - Multiple namespace support with dropdown switcher
  - Recent workflows section for quick access
  - Auto-refresh every 30 seconds
  - Grouped view by status (Running, Failed, Completed, Other)
  - Newest workflows appear first

- **Dashboard Command**
  - View workflow counts by status (Running, Completed, Failed, etc.)
  - Time range filter (last hour, 24h, 7d, 30d, all time)
  - Quick stats: success rate, active workflows, failure count
  - Auto-refresh every 30 seconds

- **Workflow Details**
  - View workflow status, duration, task queue
  - Display memo and search attributes (properly decoded)
  - Show parent workflow information
  - Open workflow in Temporal Web UI (Cmd+O)

- **Workflow History**
  - Grouped view by activities, timers, and signals
  - Activity status tracking (scheduled, running, completed, failed)
  - Duration display for completed activities
  - Copy event details to clipboard

- **Workflow Interactions**
  - Send signals to running workflows with JSON payload
  - Query workflow state with custom query types
  - Cancel running workflows (graceful)
  - Terminate running workflows (immediate)
  - Reset failed/completed workflows to a previous state

- **Copy as CLI Commands**
  - Copy `temporal workflow describe` command
  - Copy `temporal workflow show` command for history
  - Copy signal, query, cancel, terminate commands
  - Commands include correct namespace and IDs

- **Start Workflow Command**
  - Start new workflows with custom configuration
  - Auto-generate workflow IDs
  - Remember last used workflow type and task queue
  - JSON input support

- **Schedules Command**
  - List all schedules with status indicators
  - View schedule details and upcoming runs
  - Pause and unpause schedules
  - Trigger schedules immediately
  - Delete schedules with confirmation

- **Search Attributes Command**
  - View system search attributes (WorkflowId, WorkflowType, StartTime, etc.)
  - View custom search attributes
  - Filter by system or custom
  - Copy attribute names and example queries

- **Manage Connections Command**
  - Add, edit, and delete Temporal server connections
  - Test connection connectivity
  - Support for multiple clusters (Local, Staging, Production)
  - Support for self-hosted Temporal and Temporal Cloud
  - Optional Web UI URL for opening workflows in browser
