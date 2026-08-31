# GitHub Pull Requests

A [Raycast](https://raycast.com) extension that tracks unread pull request activity across your GitHub or GitHub Enterprise repositories. Never miss a review, comment, or push again.

## Features

- **Unread tracking** — Surfaces new reviews, code comments, issue comments, commits, label changes, and force pushes since you last checked.
- **Multi-repo support** — Monitor multiple `owner/repo` repositories from a single command.
- **Per-item seen state** — Mark individual activity items or entire PRs as read. State persists in Raycast local storage.
- **Rich detail view** — Inline diffs, threaded review conversations, and markdown rendering for every activity type.
- **Event filters** — Toggle which activity types appear (reviews, comments, commits, labels, force pushes, etc.).
- **Local caching** — Cached data displays instantly while a background refresh runs.
- **Demo mode** — Built-in sample data for trying out the extension without a real token.
- **Menu bar alert** — A background command refreshes every 5 minutes and shows how many PRs have unread changes in the macOS menu bar (macOS only). Click a PR to jump straight into it in **View Pull Requests**.

## Setup

1. Install the extension in Raycast.
2. Open **View Pull Requests** and configure the required preferences:

| Preference                | Description                                                                |
| ------------------------- | -------------------------------------------------------------------------- |
| **GH Host**               | GitHub hostname — defaults to `github.com`; set only for GitHub Enterprise |
| **Personal Access Token** | A PAT with `repo` read access                                              |
| **Repositories**          | Comma-separated `owner/repo` list                                          |
| **Max Unread PRs**        | Max PRs with unread activity to show (1–1000, default 25)                  |
| **Max PRs to Scan**       | Safety cap on PRs fetched while finding unread ones (1–1000, default 150)   |
| **Menu Bar Icon**         | Keep the menu bar icon visible even when everything is read (off by default) |
| **Faster Fetching**       | Use the GraphQL API — far less API quota on large repos (experimental, off)  |
| **Verbose Logging**       | Detailed console logs for troubleshooting; secrets redacted (off by default) |

## Usage

Open Raycast and run **View Pull Requests**. The command shows a list of open PRs sorted by the latest updates.

- **Select a PR** to see a summary of all unseen activity.
- **Select an activity item** to view full detail (diff hunks, conversation threads, review verdicts).
- **Mark as Read** — Use `CMD`/`CTRL` + `D` to mark a single item as read, `CMD`/`CTRL` + `S` to mark an entire PR as read, or mark all PRs as read with `CMD`/`CTRL` + `Shift` + `S`.
- **Toggle Event Filters** — show/hide specific activity types.

### PR Filters

Use GitHub-style search filters to narrow **View Pull Requests** to a specific set. Click the search-bar dropdown to switch, create, edit, or delete filters.

**Supported qualifiers:**

- `assignee:username` — PRs assigned to you or a specific user
- `author:username` — PRs opened by you or a specific user
- `involves:username` — PRs where the user commented, reviewed, or was mentioned
- `review-requested:username` — PRs where review is pending from you or a specific user
- `label:name` — PRs with a specific label
- `draft:true` or `draft:false` — show only drafts or non-drafts
- `@me` — shorthand for your own GitHub login (auto-resolved once per session)

**Modifiers:**

- Negate any qualifier with a leading dash: `-author:bot` excludes bot-opened PRs
- Combine multiple values per qualifier with commas: `assignee:alice,bob`
- Repeat qualifiers: `label:bug label:urgent` (both labels)
- Free-text words search the PR title: `ui layout` finds PRs with "ui" and "layout" in the title

Filters are saved locally and applied during fetch — they don't waste your **Max Unread PRs** and **Max PRs to Scan** budget on excluded pull requests.

### Unread PR Alert (menu bar)

Enable the **Unread PR Alert** command on MacOS to show a menu bar item with the number of PRs that have unread changes. It refreshes automatically every 5 minutes, immediately when you open or refresh **View Pull Requests**, and whenever you mark items, PRs, or everything as read — so the badge count stays in sync with what you have seen. It shares its data with **View Pull Requests**, so opening the main command shows already-cached data. Clicking a PR in the dropdown opens **View Pull Requests** with that PR expanded. The menu bar item disappears if there are no new unread changes.

## License

MIT
