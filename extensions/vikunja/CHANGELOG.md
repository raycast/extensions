# Changelog

## [Quick Add with Quick Add Magic] - {PR_MERGE_DATE}

- New `Quick Add` command to create a task from a single line, with a live preview of the parsed result while typing
- Quick Add Magic parsing for natural dates, `*label`, `+project`, `!priority`, `@assignee`, and repeat intervals such as "every week"
- Press Enter to review the parsed result in a prefilled form, or Cmd+Enter to create the task right away
- New "Quick Add Magic" preference to choose the prefix syntax (Vikunja, Todoist, or disabled)
- New "Default Reminder" preference to add a reminder relative to the due date
- Missing labels are created on submit, so cancelling the form leaves no unused labels behind
- Assignees are matched against project members; names that do not match are reported and skipped instead of blocking creation
- Repeat intervals can be adjusted in the confirmation form
- Recent Quick Add inputs are offered when the search bar is empty
- Fix project and label lookups only reading the first page of results, which could duplicate an existing label on instances with more than 50 labels

## [Updates] - 2026-04-28

- Reorder actions in TaskList

## [Create Task Quick Action & Preselect Project] - 2026-04-22

- Added Cmd+N / Create Task action in the `List Tasks` view and in each task's action panel to quickly create a new task.
- When creating a task from a project context (either the currently selected project in `List Tasks` or via a task's action), the `Create Task` form is opened with that project preselected.
- `create-task` now accepts an optional `projectId` argument and also respects `launchContext.projectId` for compatibility.

## [Default Project Preference] - 2026-04-19

- Add optional "Default Project" Raycast preference (`defaultProject`) to set the initial project shown in List Tasks (use "all" or a project id).
- `List Tasks` now respects the preference when opened without a launch context; explicit launch context `projectId` still takes precedence.
- Updated generated preference types and manifest to include the setting.

## [Task Detail View, Search, and Caching] - 2026-03-25

- Task Detail view with full markdown description and metadata sidebar
- New "Search Tasks" command with debounced API search across all tasks
- All list commands migrated to `useCachedPromise` for instant navigation
- Labels TagPicker in Edit Task form with pre-selected current labels
- Proper label add/remove support when editing tasks
- Shared `TaskListItem`, `TaskDetail`, `EditTaskForm`, and `TaskActions` components
- Shared date and priority helpers extracted to `src/helpers/`

## [Initial Version] - 2026-03-25

- Create tasks with title, description, project, due date, priority, labels, and favorite
- Pre-fill task title from selected text or quick argument
- List and browse tasks across all projects or filtered by project
- Edit tasks inline (title, description, project, due date, priority, favorite)
- Quick actions: set priority, toggle favorite, move to project
- Browse and manage projects with hierarchy (parent/sub-projects)
- Create, edit, archive, and delete projects
- Complete, reopen, and delete tasks
- Copy task title or URL to clipboard
- Open tasks and projects in Vikunja browser UI
- Smart due date display with color-coded urgency
- Priority and label tags in task list
- Navigate from projects directly to their tasks
