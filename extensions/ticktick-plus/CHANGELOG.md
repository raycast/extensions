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
- **Templates** and **Focus Stats** commands — they rely on TickTick's internal `/api/v2` API, which rejects OAuth tokens and can't be accessed by a public extension

### Fixed
- Trash and Profile logging the user out on open — these hit TickTick's internal `/api/v2` API, which rejects OAuth tokens (`401 user_not_sign_on`). A V2 401 no longer wipes the valid OAuth session; only `/open/v1` 401s trigger re-authentication. Trash now shows a clear "unavailable via public API" state with a link to TickTick
- Repeated "Sign in with TickTick" prompts caused by TickTick's unreliable refresh-token grant (`invalid_grant`) — access tokens are now treated as long-lived (~180 days) and re-authentication only happens on a real API 401
- Inbox detection via `/open/v1/project/inbox/data` and inbox ID pattern
- Menu bar timeout by removing full sync on every refresh
