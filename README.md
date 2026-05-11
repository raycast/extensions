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

### Batch Operations
- **Batch Cancel** - Cancel multiple workflows matching a query
- **Batch Terminate** - Terminate multiple workflows at once
- **Preview Count** - See how many workflows match before executing
- **Example Queries** - Pre-built query templates for common operations

## Commands

| Command | Description |
|---------|-------------|
| Search Workflows | Search and manage Temporal workflows |
| Dashboard | View workflow counts and statistics |
| Start Workflow | Start a new Temporal workflow |
| Schedules | View and manage Temporal schedules |
| Search Attributes | View system and custom search attributes |
| Batch Operations | Cancel or terminate multiple workflows at once |

## Configuration

| Setting | Description | Example |
|---------|-------------|---------|
| Connection Type | Self-Hosted/Local or Temporal Cloud | `Self-Hosted / Local` |
| Namespace | Default Temporal namespace | `default` |
| API Key | Required for Temporal Cloud authentication | |
| Temporal UI URL | URL to Temporal Web UI (used for API access) | `http://localhost:8080` |

## Setup

### Docker (docker-compose)

If you're running Temporal via Docker Compose:

- **Temporal UI URL**: `http://localhost:8080`
- **Namespace**: `default` (or your configured namespace)

### Local Dev Server

If you're using `temporal server start-dev`:

- **Temporal UI URL**: `http://localhost:8233`
- **Namespace**: `default`

### Temporal Cloud

For Temporal Cloud:

- **Connection Type**: `Temporal Cloud`
- **Temporal UI URL**: `https://cloud.temporal.io`
- **API Key**: Generate from Temporal Cloud settings
- **Namespace**: Your cloud namespace (e.g., `your-namespace.your-account`)

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
| Trigger Now | `Cmd + T` |
| Pause | `Cmd + P` |
| Unpause | `Cmd + U` |
| Delete | `Cmd + Shift + Backspace` |
| Refresh | `Cmd + R` |

### Batch Operations
| Action | Shortcut |
|--------|----------|
| Execute | `Enter` |
| Preview Count | `Cmd + P` |

## Requirements

- [Raycast](https://raycast.com/) for macOS
- A running Temporal server (self-hosted, Docker, or Temporal Cloud)
