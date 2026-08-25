# Claude Artifacts Changelog

## [Tell You When Tracking Stops] - {PR_MERGE_DATE}

- Added an **Artifact Tracking Is Off** row at the top of the list when the Claude Code hook is not registered — until now a list that had quietly stopped updating looked exactly like one that was up to date
- Added a **Set Up Artifact Tracking** screen with a prompt you can paste into Claude Code to install and register the hook for you, instead of leaving you holding a JSON fragment with nowhere to put it
- The same screen now backs the first-run empty state, so setup instructions no longer differ depending on how you got there
- Renamed the Finder actions from **Reveal** to **Show**, matching the verb Raycast uses elsewhere

## [Open the Artifact Galleries] - 2026-08-03

- Added **View Claude Code Artifacts** (⌘⇧O) and **View Claude Artifacts** (⌘⇧G), which open the two galleries on claude.ai
- These appear in every state, including the empty ones — when an artifact was published from the chat app or from another machine, it is legitimately absent from the local index, and the gallery is where it actually lives
- Shortened the per-artifact actions to **Open** and **Open Folder**

## [Initial Version] - 2026-07-27

- Search your Claude Code artifacts by title or project, sorted most-recent-first
- Open an artifact in the browser, copy its link or title, or reveal the project folder it was published from
- Filter by project once more than one project has recorded artifacts
- Reads a local index at `~/.claude/artifacts.json` — no network calls, no API key
- Ships the `PostToolUse` hook that records artifacts as you publish them, plus a diagnostic probe for verifying the hook yourself
