# GitHub PR Tracker

A [Raycast](https://raycast.com) extension that tracks unread pull request activity across your GitHub (Enterprise) repositories. Never miss a review, comment, or push again.

## Features

- **Unread tracking** — Surfaces new reviews, code comments, issue comments, commits, label changes, and force pushes since you last checked.
- **Multi-repo support** — Monitor multiple `owner/repo` repositories from a single command.
- **Per-item seen state** — Mark individual activity items or entire PRs as read. State persists in Raycast local storage.
- **Rich detail view** — Inline diffs, threaded review conversations, and markdown rendering for every activity type.
- **Event filters** — Toggle which activity types appear (reviews, comments, commits, labels, force pushes, etc.).
- **Local caching** — Cached data displays instantly while a background refresh runs.
- **Demo mode** — Built-in sample data for trying out the extension without a real token.

## Setup

1. Install the extension in Raycast.
2. Open **My PR Updates** and configure the required preferences:

| Preference                | Description                                       | Required |
| ------------------------- | ------------------------------------------------- | -------- |
| **GH Host**               | GitHub hostname (`github.com` or your GHE server) | ✅       |
| **Personal Access Token** | A PAT with `repo` read access                     | ✅       |
| **Repositories**          | Comma-separated `owner/repo` list                 | ✅       |

## Usage

Open Raycast and run **My PR Updates**. The command shows a list of open PRs grouped by unseen update count.

- **Select a PR** to see a summary of all unseen activity.
- **Select an activity item** to view full detail (diff hunks, conversation threads, review verdicts).
- **Mark as Read** — mark a single item, an entire PR, or all PRs as seen.
- **Toggle Event Filters** — show/hide specific activity types.

## Development

```bash
# Install dependencies
npm install

# Start dev mode (hot reload)
npm run dev

# Lint
npm run lint

# Build
npm run build
```

## License

MIT
