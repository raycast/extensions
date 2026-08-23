# Raycast Redmine

This [Raycast](https://raycast.com) extension lets you quickly find, read and update [Redmine](https://www.redmine.org) issues.

## Commands

- **Open Issues** — every open issue across your projects, most recently updated first.
- **Created by Me** — the open issues you reported.
- **My Issues** — the open issues currently assigned to you.

All three share the same behaviour: type to full-text search issues (subject and description) through Redmine's own search, or use the project dropdown in the search bar to narrow the list to a single project. Your project choice is remembered between launches.

## Features

- Press ⏎ on an issue to open a **detail view** with its description, metadata and comments — and edit it without leaving Raycast:
  - **Add a comment** (`⌘N`)
  - **Change status** (`⌘S`), **assignee** (`⌘A`) or **priority** (`⌘P`)
- Ask **Raycast AI** about your tracker: type `@redmine` in AI Chat to search issues by keyword (open or closed) and filter by status, assignee or creator. The AI Extension is read-only — editing always goes through the commands above.
- Configure the list item dot color based on the Priority names your instance might use. Note: this is currently limited to Red / Orange / Blue and No Color for the rest.
- Use the following actions on found entities:
  - Open in browser
  - Copy URL
  - Copy markdown link
  - Copy HTML link

## Setup

To connect the extension to your Redmine instance you need to fill the following preferences:

- **Redmine Domain:** The domain of your Redmine instance like `mycompany.redmine.org`, or a full base URL like `http://mycompany.redmine.org:8080/redmine`.
- **API Token:** An API token created as described in [How to get my API key](https://www.redmine.org/boards/2/topics/53956/).
