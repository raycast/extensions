# Motion Raycast Extension

A Raycast extension for interacting with the [Motion](https://www.usemotion.com/) task management platform directly from your desktop.

## Features

- **Add Task**: Quickly create new tasks with title, description, due date, priority, project, and label
- **Edit Task**: View and edit your existing tasks, including updating priorities, deadlines, and project assignments
- **Delete Task**: Easily delete tasks from your Motion account
- **Workspace Details**: View your Motion workspaces and get workspace IDs necessary for task creation
- **List Tasks**: Browse, search, and filter your Motion tasks by name, label, and project
- **Ask Motion**: Use AI to ask questions about your tasks, deadlines, and schedule

## Installation

### Option 1: Install from Raycast Store (Recommended)
1. Install the extension from the Raycast store.
2. Set up your Motion API credentials:
   - Get your API key from Motion's developer settings
   - Use the "Workspace Details" command to find your workspace ID
   - Add these to the extension preferences in Raycast

### Option 2: Development Setup
1. Clone this repository
2. Open the directory in your terminal
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start the development server

## Configuration

1. Get your Motion API key from the Motion platform's developer settings
2. Find your workspace ID using the "Workspace Details" command in the extension
3. Configure the extension with your API key and workspace ID in Raycast preferences

## Usage

### Adding Tasks
- Use the "Add Task" command to quickly create new tasks
- Fill in the task details including name, description, due date, priority, and more
- Click "Create Task" to add the task to your Motion account

### Editing Tasks
- Use the "Edit Task" command to view and modify existing tasks
- Search for tasks by name or description 
- Select a task to edit its properties
- Click "Update Task" to save your changes

### Deleting Tasks
- Use the "Delete Task" command to remove tasks from your Motion account
- Select a task from the list and confirm deletion

### Viewing Workspaces
- Use the "Workspace Details" command to view all available Motion workspaces
- This is useful for finding your workspace ID for configuration

## Development

This extension is built with:
- React
- Raycast API
- TypeScript

## License

MIT

## Author

Created by Owen Price

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
