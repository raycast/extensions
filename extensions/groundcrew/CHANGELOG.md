# Groundcrew Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Browse Groundcrew tasks from every configured source, with on-demand task details and links.
- View Groundcrew status: active, preserved, and missing workspaces, queue and slot health, and degraded probes.
- Start a task by ticket number, including tickets that are not in the browse list.
- Open a task's cmux workspace, an editor, or attach to its session; copy its branch, path, and id.
- Lifecycle actions per task: Start, Stop, Stop with Reason, Stop & Clean Up, Resume, Resume with New Session, Cleanup, Mark Task Done.
- Bulk "Clean Up All Idle Workspaces", with an explicit force variant for worktrees that have uncommitted changes.
- Open an existing pull request or branch in a Groundcrew worktree.
- Groundcrew Doctor command that surfaces `crew doctor` diagnostics, reachable from setup errors.
- Configurable Groundcrew executable path and editor application, with automatic discovery from PATH and common install locations.
