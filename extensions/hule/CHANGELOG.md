# Hule Changelog

## [Quick Capture List] - 2026-10-31

- Quick Add Task writes to your Quick capture list from Hule's account settings — the same list the Hule Telegram bot uses. The Default List preference is gone: if you had set it, choose that list as your Quick capture list in Hule.
- Without a Quick capture list, Quick Add Task opens Create Task with your title filled in, so you pick the list for that one task.
- Create Task lists your Inbox lists first, one per workspace, and keeps that order while you search.
- Requests carry a `HuleRaycast/1.0.0` User-Agent, so Hule can tell how much the extension is used. Nothing else is sent.

## [Fix Installation on Raycast 2.4] - 2026-09-20

- Build against Raycast API 2.4.0, the version the current Raycast release ships, so the extension can be installed

## [Initial Release] - 2026-09-14

- Quick Add Task: create a task from a single line, into a configurable default list
- Create Task: list, title, description, priority, due date and assignee
- Search Tasks: search a workspace, with a workspace picker when you belong to several
- My Tasks: everything assigned to you, grouped by when it is due
- Task actions: change status, priority, due date and assignee; open in Hule; copy link; delete
