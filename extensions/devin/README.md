# Devin

Manage Devin sessions from Raycast.

Devin for Raycast gives you a fast command palette for working with Devin sessions without leaving your keyboard.

## Features

- Browse and search Devin sessions
- Separate your sessions from the rest of your team
- Open sessions directly in Devin
- Review recent messages and session details
- Create a new session
- Send a message to an existing session
- Pin favorites and keep recently used sessions easy to reach

## Setup

1. Generate a Devin API key in your Devin account.
2. Open the extension preferences in Raycast.
3. Set:
   - `Devin API Key`
   - `Devin App URL` if you use a non-default app host
   - `Devin API URL` if you use a non-default API host
   - `My Devin Email` if you want the list split into your sessions vs everyone else's

The extension currently targets the Devin v1 API:

- `GET /v1/sessions`
- `GET /v1/sessions/{session_id}`
- `POST /v1/sessions`
- `POST /v1/sessions/{session_id}/message`

## Local Development

```bash
npm install
npm run dev
```
