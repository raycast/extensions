# Redmine Changelog

## [Open Issues, AI Extension, Issue Editing and Project Filter] - 2026-08-05

- Added an **Open Issues** command listing all currently open issues across projects, most recently updated first.
- Added a **Created by Me** command, scoped to the open issues you created.
- **My Issues** (previously "Show My Issues") is now scoped to your open issues and supports the same search and filtering as the other commands.
- Added an **AI Extension** with a read-only `Search Issues` tool, so `@redmine` can full-text search issues (open or closed) and answer questions about the tracker.
- Added an **issue detail view** (⏎ on an issue) showing the description, metadata and comments, with keyboard actions to **add a comment** and to change the **status**, **assignee** or **priority**.
- Added a **project filter** dropdown in the search bar of every list command, which remembers your last choice.
- Search text is now sent to Redmine's own full-text search (subject + description) instead of only filtering the already loaded issues.
- List items now show the assignee as an accessory, with the priority as the colored dot's tooltip.
- Fixed the orange and blue priority colors being ignored when the "Red Issues Priorities" preference was left empty.
- Replaced `node-fetch` with the built-in `fetch` and updated the extension to the current Raycast API.

## [Initial Version] - 2022-04-17
