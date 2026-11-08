# Timevoice for Raycast

Track time in [Timevoice](https://timevoice.mahadk.com) without leaving the keyboard.

| Command | What it does |
| --- | --- |
| Start Timer | Form with description, project, tags and billable. Stops the running timer first, like the web app. |
| Stop Timer | Stops the running timer and shows its duration. |
| Running Timer | Menu bar item with the elapsed time, a Stop action, and one-click Continue for recent work. |
| Recent Time Entries | The last two weeks grouped by day: continue, stop, copy, delete, open in Timevoice. |
| Add Time Entry | Logs a finished block of time with a start and end. |

## Setup

No setup is needed for timevoice.mahadk.com. The first command you run asks you to sign in to Timevoice in your browser and approve Raycast's access to:

- **View account info** (`read`), to find your workspace
- **Manage time entries** (`time_entries`), to start, stop, add and delete entries

Raycast keeps the token and refreshes it on its own.

If you belong to several workspaces, set **Workspace ID** in the extension preferences to the ID in your Timevoice URL, such as `k5nR8m` in `/k5nR8m/timer`. Otherwise the extension uses your first workspace.

### Self-hosted Timevoice

1. In your Timevoice instance, open **Settings → Developer** and create an application with:
   - **Redirect URI:** `https://raycast.com/redirect?packageName=Extension`
   - **Scopes:** `read` and `time_entries`
   - **Confidential:** off (Raycast signs in with PKCE and keeps no secret)
2. In the extension preferences, set **Timevoice URL** to your instance and **OAuth Client ID** to the application's client ID.

## Development

```sh
npm install
npm run dev    # loads the extension into Raycast
npm run build  # type-checks and builds for distribution
npm run lint
```

The extension uses only the public [Timevoice API v1](https://github.com/skyfallwastaken/timevoice/blob/main/docs/openapi.yml). Its source lives in the `raycast/` folder of the [Timevoice repository](https://github.com/skyfallwastaken/timevoice).
