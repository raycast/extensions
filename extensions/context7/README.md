# Context7

Search up-to-date documentation for any library, framework, or SDK — keep the ones you use offline, and ask Raycast AI about them.

## Commands

- **Search Libraries** — find a library or documentation source on Context7. Opens on your saved libraries, then suggested searches.
- **My Libraries** — the libraries you saved. Their documentation is kept on disk, so it opens instantly and works offline; each row shows when it was last captured, and Refresh pulls a fresh copy.
- **Search Documentation** — searches **all** your libraries at once, instantly and offline, from the local copies. Narrow to a single library with the dropdown and Context7's semantic search runs too, which finds snippets whose wording differs from your query. Any snippet can be explained in place with Ask Raycast AI.
- **My Snippets** — the snippets you saved, from every library at once. Snippets are stored as snapshots, so they survive a library refresh.

## Ask Raycast AI

The extension exposes four AI tools, so you can ask Raycast AI directly:

> `@context7 how do I set up middleware in Next.js?`

It resolves the library, pulls current documentation, and answers from it rather than from
memory. Ask about something already in **My Libraries** and it searches your local copy —
instant, offline, and it spends no API quota.

## What It Does

This extension lets you:

- Search Context7 libraries from Raycast
- Add libraries to keep their documentation available offline
- Save individual snippets and find them again across libraries
- Create Raycast Quicklinks that jump straight into a specific library's documentation
- Copy or paste returned markdown content directly from Raycast

## Setup

No setup is required to try the extension — Context7 serves a limited number of anonymous requests per month, so search works out of the box.

To raise that limit, add a free API key:

1. Open Raycast Settings
2. Go to `Extensions` > `Context7`
3. Set `Context7 API Key`

You can create an API key from the Context7 dashboard.

Enable `Verbose Logging` in the same preferences pane to print request and response detail to the console — useful when reporting or diagnosing a bug.
