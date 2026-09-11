# Temporal

Search, view, and manage Temporal workflows directly from Raycast.

## Features

### Search Workflows
- **Live Search** - Search by workflow ID or type as you type
- **Filter by Status** - Quick filter for Running, Completed, Failed, Cancelled, etc.
- **Multiple Namespaces** - Switch between namespaces from the dropdown
- **Recent Workflows** - Quick access to recently viewed workflows
- **Auto-refresh** - Automatic refresh every 30 seconds

### Dashboard
- **Workflow Counts** - See counts by status (Running, Completed, Failed, etc.)
- **Time Range Filter** - View stats for last hour, 24h, 7d, 30d, or all time
- **Success Rate** - Quick calculation of workflow success rate
- **Active & Failure Counts** - At-a-glance metrics

### Workflow Details
- View workflow status, duration, task queue, and metadata
- See memo and search attributes
- View parent workflow information

### Workflow History
- **Grouped View** - Activities, timers, and signals grouped together
- **Activity Status** - See scheduled, running, completed, and failed activities
- **Activity Details** - View full activity input, output, failure details, and timeline
- **Duration Tracking** - See how long each activity took

### Workflow Interactions
- **Send Signal** - Send signals to running workflows with JSON payloads
- **Query Workflow** - Query workflow state and view results
- **Cancel Workflow** - Graceful cancellation request
- **Terminate Workflow** - Immediate termination
- **Reset Workflow** - Reset failed/completed workflows to a previous state

### Copy as CLI Commands
- Copy `temporal workflow describe` command
- Copy `temporal workflow show` command for history
- Copy signal, query, cancel, terminate commands
- All commands include correct namespace and workflow IDs

### Start Workflow
- Start new workflows with custom ID, type, task queue, and input
- Remembers last used workflow type and task queue
- Auto-generates workflow IDs if not specified

### Schedules
- **List Schedules** - View all schedules with status and next run time
- **Pause/Unpause** - Toggle schedule execution
- **Trigger Now** - Execute a schedule immediately
- **Delete Schedule** - Remove schedules with confirmation

### Search Attributes
- **System Attributes** - View built-in search attributes (WorkflowId, WorkflowType, etc.)
- **Custom Attributes** - View your custom search attributes
- **Copy Query Examples** - Get example queries for each attribute type

### Manage Connections
- **Add Connection** - Add new Temporal server connections with a form
- **Edit Connection** - Modify existing connection settings
- **Delete Connection** - Remove connections you no longer need
- **Test Connection** - Verify connectivity and see available namespaces

## Commands

| Command | Description |
|---------|-------------|
| Search Workflows | Search and manage Temporal workflows |
| Dashboard | View workflow counts and statistics |
| Start Workflow | Start a new Temporal workflow |
| Schedules | View and manage Temporal schedules |
| Search Attributes | View system and custom search attributes |
| Manage Connections | Add, edit, and remove Temporal server connections |

## Configuration

### Getting Started

On first launch, a default "Local" connection is created pointing to `localhost:7233`. This works out of the box if you're running Temporal locally via Docker or the dev server.

To configure your connections, use the **Manage Connections** command:

1. Open Raycast and search for "Manage Connections"
2. Add, edit, or remove Temporal server connections
3. Test connections to verify they work

### Connection Settings

Each connection has the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | Display name (e.g., "Local Dev", "Production") |
| Connection Type | Yes | "Local / Self-Hosted" or "Temporal Cloud" |
| gRPC Address | Yes | Temporal gRPC address (e.g., `localhost:7233`) |
| Namespace | Yes | Default namespace for this connection |
| API Key | No | API key for Temporal Cloud authentication |
| Web UI URL | No | URL to open workflows in browser (e.g., `http://localhost:8233`) |

### Example Addresses

- **Local (Docker or dev server):** `localhost:7233`
- **Self-hosted:** `temporal.mycompany.com:7233`
- **Temporal Cloud:** `namespace.accountid.tmprl.cloud:7233`

### Web UI URLs (Optional)

Set a Web UI URL to enable "Open in Temporal UI" (Cmd+O) for workflows:

- **Local dev server:** `http://localhost:8233`
- **Docker compose:** `http://localhost:8080`
- **Temporal Cloud:** `https://cloud.temporal.io`

### Multiple Connections

When you have multiple connections configured, a cluster switcher appears in the dropdown menu of all commands. You can quickly switch between Local, Staging, and Production environments.

## Keyboard Shortcuts

### Search Workflows
| Action | Shortcut |
|--------|----------|
| View Details | `Enter` |
| View History | `Cmd + H` |
| Send Signal | `Cmd + S` |
| Query Workflow | `Cmd + Q` |
| Copy Workflow ID | `Cmd + .` |
| Copy Run ID | `Cmd + Shift + .` |
| Open in Temporal UI | `Cmd + O` |
| Reset Workflow | `Cmd + Shift + R` |
| Cancel Workflow | `Cmd + Backspace` |
| Terminate Workflow | `Cmd + Shift + Backspace` |
| Refresh | `Cmd + R` |

### Schedules
| Action | Shortcut |
|--------|----------|
| View Details | `Enter` |
| Copy Schedule ID | `Cmd + .` |
| Trigger Now | `Cmd + T` |
| Pause | `Cmd + P` |
| Unpause | `Cmd + U` |
| Delete | `Cmd + Shift + Backspace` |
| Refresh | `Cmd + R` |

## Requirements

- [Raycast](https://raycast.com/) for macOS
- A running Temporal server (self-hosted, Docker, or Temporal Cloud)

## Author

Built by [Nikolay Kolibarov](https://github.com/nikolaykolibarov) at [Applause Lab](https://www.applauselab.ai).
