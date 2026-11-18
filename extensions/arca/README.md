# Arca

Manage your Arca tasks without leaving Raycast. Create tasks, review everything assigned to you, and see what's coming up, all from the command bar.

## Commands

- **Create Task**: Fill a quick form to create a task in any workspace and list, with status, priority, assignees, start date, and due date.
- **My Tasks**: See all tasks assigned to you across every workspace, grouped by priority. Filter by workspace or toggle completed tasks on and off.
- **Planned Tasks**: See tasks that have a due or start date, grouped into Overdue, Today, Tomorrow, and upcoming dates. Filter by workspace.

## Setup

This extension requires an **Arca API key**.

1. Open the [Arca web app](https://web.getarca.app) or the desktop app.
2. Go to **Settings → API**.
3. Generate a new API key and copy it.
4. Open Raycast, run any Arca command, and paste the key into the **Arca API key** preference field.

## Preferences

| Preference               | Description                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Arca API key**         | Required. Your personal API key for authenticating with the Arca API.                                     |
| **Show Completed Tasks** | When enabled, completed and cancelled tasks are shown in My Tasks and Planned Tasks. Disabled by default. |
