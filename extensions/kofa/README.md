# Kofa for Raycast

Capture tasks into [Kofa](https://kofa.dev) — the minimalist todo and day planner — without leaving your keyboard.

## Features

- **Add Task** command with title, optional notes, due date and color.
- Due date accepts natural language: type _today_, _tomorrow_, _next monday_, _in 3 days_, or pick from the calendar.
- Coral / orange / green / blue / purple / white color tags match the in-app palette.
- `⌘ ⏎` to submit and immediately create another task.

## Setup

1. Install the Kofa mobile app from the App Store / Play Store and sign in.
2. Open **Settings → Personal access tokens → Create new token**, label it "Raycast", and copy the token. The token is shown only once.
3. Open Raycast preferences for Kofa and paste the token into **Personal Access Token**.

Tokens can be revoked at any time from the same settings screen.

## Self-hosted Kofa

The default API endpoint is `https://api.kofa.dev`. Override it via the **API Base URL** preference if you're running your own backend.
