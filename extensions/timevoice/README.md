# Timevoice for Raycast

Track time in [Timevoice](https://timevoice.mahadk.com) from Raycast.

| Command | What it does |
| --- | --- |
| Start Timer | Form with description, project, tags and billable. Stops the running timer first, like the web app. |
| Stop Timer | Stops the running timer and shows its duration. |
| Running Timer | Menu bar item with the elapsed time, a Stop action, and one-click Continue for recent work. |
| Recent Time Entries | The last two weeks grouped by day: continue, stop, copy, delete, open in Timevoice. |
| Add Time Entry | Logs a finished block of time with a start and end. |

## Sign-in

The extension signs in with OAuth 2.0 authorization code + PKCE against Timevoice's Doorkeeper server, through Raycast's `OAuth.PKCEClient`. It requests the `read` and `time_entries` scopes and refreshes tokens on its own.

It ships with the client ID of the public OAuth application registered on timevoice.mahadk.com (`TIMEVOICE_CLIENT_ID` in `src/api.ts`). For a self-hosted Timevoice, set **Timevoice URL** and **OAuth Client ID** in the extension preferences, using an application created under Settings → Developer with:

- **Redirect URI:** `https://raycast.com/redirect?packageName=Extension`
- **Scopes:** `read` and `time_entries`
- **Confidential:** off (PKCE public client, no secret)

## Development

```sh
cd raycast
npm install
npm run dev    # ray develop: loads the extension into Raycast
npm run build  # type-checks and builds
npx eslint src && npx prettier --check src
```

The extension talks only to the public API v1 documented in [docs/openapi.yml](../docs/openapi.yml).
