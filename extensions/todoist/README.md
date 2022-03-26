# Raycast for Todoist

**This extension is not created by, affiliated with, or supported by Doist.**

Bring Todoist to Raycast so that you can manage your tasks easily. No more context-switching!

## Getting started

Before using the command, you need to retrieve your Todoist token located in the [integration settings view](https://todoist.com/prefs/integrations)

## Limitations

- Tasks in the "Today" and "Upcoming" views are not ordered the same as in your Todoist app because of a limitation from the [Todoist REST API](https://developer.todoist.com/rest/v1/#overview). The [Sync API](https://developer.todoist.com/sync/v8/) supports it but is not adapted for a Raycast extension.
- You can't move a task to another project because of a limitation from the Todoist REST API.
- Filters are not supported because of a limitation from the Todoist REST API.
- It's not possible to get tasks only assigned to you when sharing projects because of a limitation from the Todoist REST API.
