# Redmine Tickets

This [Raycast](https://raycast.com) extension lets you browse, search, edit and ask AI about your [Redmine](https://www.redmine.org) tickets.

> Fork of the original [Redmine extension](https://www.raycast.com/jwickers/redmine) by **jwickers**, extended with an "Open Issues" command, an issue detail/edit view, and an AI Extension.

## Features

### Commands

- **Open Issues** — lists all currently open issues (across projects), sorted by priority then last update. Filter with Raycast by ID, subject or status.
- **My Issues** — lists your currently assigned open issues.

Both commands have a **project filter** dropdown in the search bar (top-right) to narrow the list to a single Redmine project — handy when you work across several. Your choice is remembered between launches.

Press ⏎ on any issue to open a **detail view** (description, metadata, comments) where you can, from the keyboard:

- **Add a comment** (⌘N)
- **Change the status** (⌘S)
- **Change the assignee** (⌘A)
- **Change the priority** (⌘P)

These write actions live only in the commands — the AI Extension stays read-only.

### AI Extension

In Raycast AI Chat, type `@` and search for **Redmine Tickets** to let the AI query your tracker. It exposes a `Search Issues` tool that can:

- full-text search issues by keyword in **subject and description**, across **open or closed** issues;
- list issues filtered by status (`open` / `closed` / `all`) and optionally restricted to those assigned to you;
- return structured issue data (id, subject, status, priority, project, assignee, dates, url, description).

Examples:

- _"what are my open tickets about the login page?"_
- _"find closed issues mentioning 'timezone'"_
- _"summarize the highest-priority open bugs"_

### Everything else

- Configure the list item dot color based on the Priority names your instance uses (Red / Orange / Blue, No Color for the rest).
- Actions on each issue: Open in browser, Copy URL, Copy markdown link, Copy HTML link.

## Setup

To connect the extension to your Redmine instance you need to fill the following preferences:

- **Redmine Domain:** The domain of your Redmine instance like `mycompany.redmine.org` (or a full base URL such as `http://mycompany.redmine.org:8080/redmine`).
- **API Token:** An API token created as described in [How to get my API key](https://www.redmine.org/boards/2/topics/53956/).

## Development

```bash
npm install
npm run dev      # ray develop — hot reload into Raycast
npm run lint     # ray lint
```

Requires Node 22.14+ per Raycast's current requirements (developed/tested here on Node 18, which still builds, but upgrade before publishing to the Store to match CI).
