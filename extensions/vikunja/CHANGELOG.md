# Changelog

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
