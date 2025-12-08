# Changelog

## [Initial Release] - {PR_MERGE_DATE}

### Added
- **Create Jira Issue**: Command to quickly create new issues directly from Raycast.
- **Create Subtask**: Command to create subtasks for existing issues. Also available as a quick action (Cmd+Shift+S) from the search results.
- **View Issue Details**: Comprehensive issue viewer showing description, comments, worklogs, subtasks, and linked issues without opening the browser.
- **Weekly Report**: Detailed time tracking reports with breakdown by project, issue, and day. Supports viewing reports for the past 4 weeks.
- **Active Sprint**: View and manage issues in the active sprint, grouped by status with special highlighting for your assigned tasks.
- **List My Issues**: View and manage issues assigned to the current user.
- **Search Issues**: Search capability to find specific Jira issues.
- **Time Tracking**:
  - Commands to `Start`, `Pause`, `Stop`, and `Resume` work on issues.
  - **Smart Task Switching**: When starting a new task while another is active, automatically prompts to pause the current task and log the time. Warns when switching tasks with less than 1 minute of work, offering to discard or continue.
  - **Daily Summary**: Timeline view showing all work logged with timestamps, ordered chronologically. Includes date selector to view worklogs from the past 7 days.
- **Active Issue Menu Bar**: New menu bar command that displays your currently running task.
  - Shows elapsed time.
  - Visual warning (Red icon) if the task surpasses the configured reminder interval (default 60m).
  - Quick actions to open the issue or pause work.
- **Quick Transition**: Standalone command to quickly transition an issue by key.
- **Assign Issue**: dedicated command to assign issues to users.
- **Link Issues**: Create relationships (blocks, relates to, etc.) between issues from Raycast.
- **Watch/Unwatch**: Toggle watcher status on issues directly from lists and details view.
- **Saved Filters**: Now accessible directly from the "Search for Issues" filter dropdown.
- **Notifications**: Check unread Jira notifications.
- **Authentication**: configured via Raycast preferences (Domain, Email, API Token).

### Improved
- **Error Handling**: Enhanced Jira API error messages to provide more specific feedback (e.g., field validation errors).
- **Search Experience**: Added helpful empty states and tips when no results are found in issue lists.
