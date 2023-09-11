# Google Tasks

Manage Google Tasks from Raycast.

## How to Get OAuth Client

- Enable the Google Tasks API via <https://console.cloud.google.com/apis/library/tasks.googleapis.com>
- Create an OAuth client ID via <https://console.developers.google.com/apis/credentials>
- Add the Tasks API scope (`.../auth/tasks`)
- As application type choose "iOS" (required for PKCE)
- As Bundle ID enter: `com.raycast`
