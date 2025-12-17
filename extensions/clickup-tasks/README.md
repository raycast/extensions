# ClickUp Tasks

Browse and manage your ClickUp tasks directly from Raycast. This extension provides a fast, intuitive interface for viewing tasks, navigating subtasks, and accessing full task details without leaving your keyboard.

## Features

### 🗂️ Three Powerful Commands

#### Browse Lists

- View all your ClickUp lists organized by space
- Browse through teams, spaces, and folders
- Quick navigation to any list
- See task counts for each list
- Push directly into any list to view its tasks

#### List Tasks

- View all tasks from a specific ClickUp list
- Automatic pagination fetches all tasks regardless of list size
- Navigate directly from Browse Lists command

#### My Tasks

- View only tasks assigned to you across all lists
- Personalized view with your username in the navigation title
- Filter automatically by your user ID

### 📋 Task Management

- **Hierarchical Display**: Subtasks are visually grouped with parent tasks
- **Rich Task Information**: See status, priority, tags, assignees, due dates, and descriptions
- **Instant Loading**: Cached results load immediately on subsequent opens
- **Search & Filter**: Search tasks by name, assignee, status, priority, or tags
- **Status Management**:
  - Change task status with quick shortcuts
  - Navigate to next status in workflow
  - Optimistic UI updates with automatic rollback on error

### 🔄 Subtask Support

- **Visual Hierarchy**: Subtasks displayed with dash icons and indentation
- **Smart Navigation**: Jump between parent tasks and subtasks with keyboard shortcuts
- **Subtask Counts**: See how many subtasks each parent task has at a glance
- **Filtered Views**: View all subtasks for a specific parent task in a dedicated view
- **Bidirectional Navigation**: Navigate from subtask to parent or parent to subtasks

### 📊 Detailed Task Views

View complete task information including:

- **Status & Priority**: Current workflow status and priority level with color coding
- **Assignees**: Profile pictures and usernames for all assigned users
- **Watchers**: See who's watching the task
- **Dates**: Due dates, creation timestamps, and last update times
- **Descriptions**: Full markdown task descriptions
- **Relationships**: Parent/child task hierarchies
- **Tags**: All task tags displayed prominently
- **Links**: Direct links to open tasks in ClickUp

### 📋 Quick Actions

- **Copy Options**: Copy task URL, markdown, markdown URL, or task ID
- **Open in Browser**: Open task directly in ClickUp (default action)
- **View Details**: See full task metadata in detail view
- **Navigation**: Jump to parent task or view all subtasks
- **Status Changes**: Quick status update and next status shortcuts

### ⚡ Performance

- **Parallel API Calls**: Lists and tasks load 10x faster with optimized parallel requests
- **Cached Data**: Tasks and lists load instantly from cache
- **Optimistic Updates**: UI updates immediately with automatic rollback on errors
- **Memoized Computations**: Efficient rendering even with 100+ tasks
- **Rate Limit Handling**: Graceful error messages when hitting API limits

## Setup

### 1. Generate a ClickUp API Token

1. Log in to your ClickUp account
2. Navigate to **Settings** (click your avatar in the bottom-left)
3. Go to **Apps** in the sidebar
4. Click **Generate** under "API Token"
5. Copy your personal API token (it begins with `pk_`)

### 2. Find Your List ID

You can find your list ID in one of two ways:

**Option A: From the URL**

- Open your ClickUp list in a browser
- The URL will look like: `https://app.clickup.com/12345678/v/li/901234567`
- The list ID is the number after `/li/` (e.g., `901234567`)

**Option B: Use Browse Lists Command**

- After entering your API token, use the "Browse Lists" command
- Navigate through your spaces to find the list you want
- View tasks directly from any list

### 3. Configure the Extension

1. Open Raycast
2. Search for "ClickUp Tasks", "My Tasks", or "Browse Lists"
3. Press `⌘ ,` (Command + Comma) to open extension preferences
4. Enter your:
   - **ClickUp API Token**: The token you generated in step 1
   - **ClickUp List/Board ID**: The list ID from step 2 (required for "List Tasks" command only)

## Usage

### Browse Lists Command

Search for "Browse Lists" in Raycast to explore your ClickUp workspace.

**Features:**

- View all spaces and lists organized by team
- See task counts for each list
- Press `⏎` (Enter) to view all tasks in a list
- Press `⇧ ⏎` (Shift + Enter) to open list in ClickUp
- Navigate through complex workspace hierarchies

### List Tasks Command

Search for "List Tasks" in Raycast to view all tasks from your configured list.

**Features:**

- View all tasks with their current status
- See subtasks indented under parent tasks
- View assignees, priorities, due dates, and subtask counts
- Search by task name, assignee, status, priority, or tags
- Press `⏎` (Enter) to view full task details
- Press `⇧ ⏎` (Shift + Enter) to open task in ClickUp

### My Tasks Command

Search for "My Tasks" in Raycast to view only tasks assigned to you.

**Features:**

- All features from List Tasks
- Automatically filtered to show only your assigned tasks
- Shows your username in the navigation title
- Works across all lists (not limited to configured list)

### Keyboard Shortcuts

| Shortcut | Action                                     |
| -------- | ------------------------------------------ |
| `⏎`      | View task details                          |
| `⇧ ⏎`    | Open task/list in ClickUp (default action) |
| `⌘ ⇧ T`  | Change task status                         |
| `⌘ ⇧ N`  | Next status (move to next workflow status) |
| `⌘ ⇧ P`  | Go to parent task (when viewing a subtask) |
| `⌘ ⇧ S`  | Show subtasks (when viewing a parent task) |
| `⌘ ⇧ ,`  | Copy task URL                              |
| `⌘ ⇧ C`  | Copy task as markdown                      |
| `⌘ ⇧ ;`  | Copy task as markdown URL                  |
| `⌘ ⇧ .`  | Copy task ID                               |

## Requirements

- ClickUp account with API access
- Valid ClickUp API token
- Access to at least one ClickUp list

## Development

Want to contribute or customize the extension? See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup instructions
- Project structure details
- Code standards and best practices
- Testing guidelines
- Pull request process

Quick start:

```bash
npm install
npm run dev
```

## Roadmap

Interested in upcoming features? See [ROADMAP.md](ROADMAP.md) for the complete development plan including:

- Task creation and editing
- Comments, checklists, and time tracking
- Custom fields and bulk operations
- Advanced views and automation

Features are organized by phase with priority ratings and progress tracking.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- How to get started
- Code standards and best practices
- Submitting pull requests
- Reporting bugs and requesting features

Check [ROADMAP.md](ROADMAP.md) for features marked 🎯 **HIGH PRIORITY** or **QUICK WIN** as great starting points.

## License

MIT

## Support

For issues or feature requests, please open an issue on the GitHub repository.
