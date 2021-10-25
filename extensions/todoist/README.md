# Raycast x Todoist

This extension brings Todoist to Raycast so that you can manage your tasks easily. No more context-switching!

![A screenshot of the today view](./images/today.png)

## Getting started

Before using the command, you need to retrieve your Todoist token. You can find it in the [integration settings view](https://todoist.com/prefs/integrations)

## Features

- See your tasks due today
- See your upcoming tasks grouped by dates
- See all your projects, tasks by project and if your project is starred
- Create a task
  - Title (markdown supported)
  - Description (markdown supported)
  - Due date
  - Priority
  - Project

For each task, you can:

- See its associated project if the list is date-based
- See its associated date if the list is project-based
- See if the task is recurring or not
- See the task's priority with a colored circle
- Open the task in Todoist (`⏎`)
- Complete the task (`⇧` + `⌘` + `C` or `⌘` + `⏎`)
- Schedule the task (`⇧` + `⌘` + `S`)
  - Today
  - Tomorrow
  - Next week
- Change its priority (`⇧` + `⌘` + `P`)
  - Low (`p1`)
  - Medium (`p2`)
  - High (`p3`)
  - Urgent (`p4`)
- Delete the task (`⇧` + `⌘` + `X`)
- Filter the tasks
  - By name
  - By priority: p1, p2, p3, p4
  - By project name if the list is date-based

## Pro tips

Assign global hotkeys to commands so that you can quickkly access them. For example:

- `⌥` + `T` to see the "Today" view
- `⌥` + `U` to see the "Upcoming" view

## Limitation

- Tasks in the "Today" and "Upcoming" views are not ordered the same as in your Todoist app because of a limitation from the [Todoist REST API](https://developer.todoist.com/rest/v1/#overview). Switching to the [Sync API](https://developer.todoist.com/sync/v8/) may bring support for it.
- You can't move a task to another project because of a limitation from the Todoist REST API.
