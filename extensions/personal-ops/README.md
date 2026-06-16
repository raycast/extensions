# Personal Ops

Personal Ops gives you a daily Raycast brief for Google Calendar, Gmail, Linear, and action items.

## Features

- Calendar highlights for today
- Important unread Gmail messages
- Active assigned Linear issues
- A short action list for what needs attention
- Optional Gemini-written summary with deterministic fallback
- Calendar RSVP actions
- Linear issue opening with the Linear app when installed

## Setup

Configure credentials in Raycast extension preferences, or provide an optional local `.env` file path.

Required:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `LINEAR_API_KEY`

Optional:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `LINEAR_DEFAULT_TEAM`
- `TIMEZONE`

Gemini is only used for short summary writing. If Gemini is unavailable, rate-limited, or not configured, the extension automatically shows a deterministic brief.
