# Buffer for Raycast

Raycast extension for managing your Buffer account without leaving the launcher. It lets you inspect channels, review scheduled, draft, and sent posts, create new content, and expose tools for Raycast AI.

## Overview

This extension helps you work with Buffer directly from Raycast.

- View your account and organizations.
- Inspect connected channels and their status.
- Browse scheduled, sent, and draft posts.
- Create queue posts, scheduled posts, and drafts.
- Create content ideas in Buffer.
- Delete posts by ID.
- Use AI tools for Buffer workflows inside Raycast.

## Main Commands

### `Scheduled Posts`

Shows upcoming scheduled Buffer posts grouped by channel.

Features:

- grouped list by channel
- individual post detail view
- scheduled date and time
- copy post text
- quick access to Buffer
- delete scheduled posts from the UI

### `Sent Posts`

Shows previously published posts, grouped by channel.

Features:

- published post detail view
- live post link when Buffer provides it
- compact metrics such as likes, clicks, and reach
- copy post text

### `Create Post`

Form-based composer for creating a new Buffer post.

Supported modes:

- **Queue**: adds the content to the next available queue slot
- **Scheduled**: schedules the post for an exact date and time
- **Draft**: saves the content as a draft

Fields and behavior:

- active channel selection
- post text
- scheduled date and time for scheduled mode
- optional image URL
- optional video URL
- optional video thumbnail URL

Current rules:

- post text is required
- a channel must be selected
- you can use **either an image or a video**, not both
- scheduled mode requires a date and time

### `Channels`

Lists all channels from the current organization and separates connected channels from disconnected ones.

Features:

- visible channel name
- platform or service name
- channel status
- detail view
- external link when available
- timezone, queue, and channel type information

### `Draft Posts`

Shows drafts and approval-pending posts grouped by channel.

Features:

- draft detail view
- copy post text
- delete drafts from Raycast
- quick access to Buffer

### `Create Idea`

Creates ideas inside Buffer for the selected organization.

Supports:

- optional title
- optional text
- optional date
- optional target services or platforms

Important rule:

- at least a **title** or **text** must be provided

### `Account Overview`

Summarizes the authenticated Buffer account.

Displays:

- name
- email
- timezone
- creation date
- available organizations
- connected apps

### `Organizations`

Lists the Buffer organizations available to the current account and lets you inspect details.

Displays:

- organization name
- owner email
- channel count
- member count
- organization limits when Buffer returns them

## Raycast AI Tools

The extension also exposes tools for use through Raycast AI.

### `get-account`

Returns the authenticated account, including organizations and connected apps.

### `list-organizations`

Lists the organizations available to the current account.

### `list-channels`

Lists active channels for the current organization.

### `get-channel`

Finds a channel by ID, display name, or service and returns detailed information.

### `list-posts`

Lists posts with optional filters such as:

- status
- channel
- date range
- result limit

### `list-scheduled-posts`

Lists scheduled posts with an optional channel filter.

### `delete-post`

Deletes a post by its exact `postId`.

### `create-post`

Creates a new post for a specific channel.

Supports:

- automatic queueing
- manual scheduling
- draft creation
- image by URL
- video by URL

### `create-idea`

Creates a new idea in the current organization.

## How It Works

- The extension uses Buffer's GraphQL API.
- Remote integration is centralized in `src/utils/buffer-api.ts`.
- Shared domain types live in `src/utils/types.ts`.
- AI tool helpers live in `src/tools/shared.ts`.
- Authentication depends on a Raycast preference named `accessToken`.

## Requirements

- Raycast installed
- active Buffer account
- Buffer access token

You can get the token at:

- `https://publish.buffer.com/settings/api`

## Setup

1. Install or run the extension in Raycast.
2. Open the extension preferences.
3. Paste your `Buffer Access Token`.
4. Run any command.

## Local Development

```bash
npm ci
npm run dev
```

Useful commands:

```bash
npm run lint
npm run build
npm run publish
```

## Publishing

When the extension is ready:

```bash
npm run publish
```

That script runs the Raycast publish flow defined in `package.json`.

## Current Limitations

- Many views and tools default to the first available organization in the account.
- Pagination is supported in the API layer, but the full pagination UX is not exposed everywhere in the UI.
- Post assets are currently limited to **one image or one video**.
- Channel resolution in AI tools uses exact and partial matching, so ambiguous queries may require disambiguation.

## Project Structure

```text
.
├── assets/
├── src/
│   ├── tools/
│   └── utils/
├── package.json
├── tsconfig.json
├── raycast-env.d.ts
└── README.md
```

## Maintenance Notes

- When GraphQL fields change, update the related TypeScript types as well.
- When adding a new command, define its metadata in `package.json`.
- When adding a new AI tool, keep the AI instructions and channel resolution behavior aligned.

## License

MIT
