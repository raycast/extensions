# Google Tasks

View, create, and manage your Google Tasks directly from Raycast.

## Features

- Browse all your task lists and tasks
- Filter tasks by status: Open, Completed, or All
- Create tasks with title, notes, and due date
- Complete and reopen tasks
- Edit task details inline
- Delete tasks
- Visual indicators for completed and overdue tasks

## Setup

This extension connects to the Google Tasks API using OAuth. You'll need to provide your own Google OAuth Client ID.

### Getting your Client ID

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Library** and enable the **Google Tasks API**
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth client ID**
6. Choose **iOS** as the application type
7. Set the **Bundle ID** to `com.raycast`
8. Copy the generated Client ID and paste it into the extension preferences

## Commands

### View Tasks

Browse your task lists, then drill into any list to see its tasks. Use the dropdown filter to show open, completed, or all tasks.

| Shortcut | Action |
|----------|--------|
| `↩` | Complete / Reopen task |
| `⌘ E` | Edit task |
| `⌘ N` | Create new task in current list |
| `⌘ ⌫` | Delete task |

### Create Task

A standalone form to quickly create a task. Pick a title, add optional notes and a due date, then choose which task list it belongs to.

## Development

```bash
# Install dependencies
npm install

# Run the extension locally in Raycast
npm run dev

# Build the extension
npm run build

# Lint
npm run lint

# Fix lint issues
npm run fix-lint

# Publish to the Raycast Store
npm run publish
```

Running `npm run dev` will start the development server and open the extension in Raycast. Changes to source files will hot-reload automatically.
