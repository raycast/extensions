# Google Tasks

Manage Google Tasks from Raycast.

## Raycast AI

Use `@google-tasks` in AI Chat to search and manage tasks. Sign in through View Tasks first.

## Setup

- Enable the [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com).
- Add the Tasks scope (`.../auth/tasks`).
- Create an [iOS OAuth client](https://console.developers.google.com/apis/credentials) with Bundle ID `com.raycast`.

Enter the client ID when Raycast prompts; it is not an API key. Reopen the command to retry a cancelled or expired sign-in.
