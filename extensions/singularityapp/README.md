# SingularityApp

Manage your [SingularityApp](https://singularity-app.com/) tasks directly from Raycast.

## Features

- **View Tasks**: Browse your tasks with multiple views (Inbox, Today, Upcoming, Completed)
- **Create Tasks**: Quickly add new tasks with title, notes, priority, dates, and project assignment
- **Task Management**: Complete, update, and delete tasks
- **Project Organization**: Organize tasks by projects with visual icons
- **Task Details**: View full task information including notes, dates, and priorities

## Getting Started

### Prerequisites

You need a SingularityApp account with Pro or Elite subscription and API token to use this extension.

### Setup

1. Install the extension from the Raycast Store
2. Run the **Set API Token** command
3. Enter your SingularityApp API token
4. Start managing your tasks!

### Getting Your API Token

To get your SingularityApp API token:

1. Log in to your [SingularityApp account](https://me.singularity-app.com/rest-tokens)
2. Navigate to **API tokens** in side bar
3. Generate or copy your API token
4. Paste it into the **Set API Token** command in Raycast

## Commands

### My Tasks

View and manage your tasks in different views:

- **Inbox**: All unscheduled tasks
- **Today**: Tasks due today
- **Upcoming**: Future tasks
- **Completed**: Finished tasks

You can set your preferred default view in the command preferences.

### Add Task

Quickly create a new task with:

- Title (required)
- Notes
- Start date
- Project assignment

### Set API Token

Configure your SingularityApp API token for authentication.

### Set Max Tasks Count

Configure the maximum number of tasks to fetch per request (workaround for API pagination limitations).

## Support

If you encounter any issues or have feature requests, please report them on the [GitHub repository](https://github.com/raycast/extensions).
