# Claude Artifacts Changelog

## [Pin Artifacts] - 2026-08-29

- Added **Pin Artifact** (⌘.) — pinned artifacts collect in a **Pinned** section at the top of the list, which is what you want once you have enough of them that recency alone stops finding the one you keep coming back to
- Pins hold inside a project filter too, so filtering does not scatter them back into the pile
- Moved to `@raycast/api` 2.1

## [Tell You When Tracking Stops] - 2026-08-27

- Added an **Artifact Tracking Is Off** row at the top of the list when the Claude Code hook is not registered — until now a list that had quietly stopped updating looked exactly like one that was up to date
- Added a **Set Up Artifact Tracking** screen with a prompt you can paste into Claude Code to install and register the hook for you, instead of leaving you holding a JSON fragment with nowhere to put it
- The same screen now backs the first-run empty state, so setup instructions no longer differ depending on how you got there
- Renamed the Finder actions from **Reveal** to **Show**, matching the verb Raycast uses elsewhere
- Updated the Store screenshot, which still showed action names from before the previous release
- Moved to `@raycast/api` 2.0 — no behavior change, and it clears every outstanding dependency advisory

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
