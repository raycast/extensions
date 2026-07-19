# TickTick Changelog

## [Initial Release] - {PR_MERGE_DATE}

### Added
- One-click **Sign in with TickTick** via Raycast's OAuth proxy — no Client ID/Secret or developer app required
- Full TickTick integration: Today, Inbox, Projects, Next 7 Days, Overdue, Search, Eisenhower Matrix
- Quick Add with notes, due date, tags, and priority
- Task details: edit, move, comments, checklist subtasks, complete with undo
- Tags, Smart Lists, Templates, Completed, Trash, Profile commands
- Habits with check-in and streak view
- Pomodoro timer synced to TickTick (start/pause/finish)
- Focus Stats and menu bar timer
- Background alerts for overdue and urgent tasks
- Manage Projects and Manage Tags

### Removed
- **Templates**, **Focus Stats**, **Manage Tags**, and **Trash** commands — they rely on TickTick's internal `/api/v2` API, which rejects OAuth tokens and can't be accessed by a public extension. Tags remain browsable via the **Tags** command

### Fixed
- Re-login loop when opening Habits, Completed, Smart Lists, or syncing — speculative `/open/v1` endpoints that don't exist in the OAuth API returned 401 and wiped the valid session. A 401 only invalidates the session for confirmed core task/project endpoints now
- Profile no longer logs the user out; it hides account details that require the internal API and shows the counts that do work
- All-day due dates were stored at UTC midnight, landing a day early in negative-UTC timezones — now anchored to local midnight
- "Overdue" and background alerts no longer flag tasks that are due today
- "Next 7 Days" now spans 7 days instead of 8
- Editing a task's project now actually moves the task instead of silently no-opping
- Failed project/habit creation no longer reports false success
- Repeated "Sign in with TickTick" prompts caused by TickTick's unreliable refresh-token grant (`invalid_grant`) — access tokens are now treated as long-lived (~180 days) and re-authentication only happens on a real API 401
- Inbox detection via `/open/v1/project/inbox/data` and inbox ID pattern
- Menu bar timeout by removing full sync on every refresh
