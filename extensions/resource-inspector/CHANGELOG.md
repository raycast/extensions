# Resource Inspector Changelog

## [Inactivity Notifications] - {PR_MERGE_DATE}

- Add opt-in watches for chosen applications and standalone programs, with a three-hour inactivity threshold adjustable to two hours.
- Deliver macOS notifications with an explicit Force Quit button. Only clicking that button authorizes immediate termination of its one named target, with an unsaved-work warning.
- Validate identity and current activity at the notification action boundary; invalidate buttons after pauses, changed rules, restarts, or resumed activity.
- Add Inactive Resources, foreground ownership measurements, local transactional state, a bundled on-demand notification app, and disposable-fixture regression tests.

## [Initial Release] - {PR_MERGE_DATE}

- Inspect physical memory, CPU, disk activity, memory pressure, compression, and swap.
- Record seven days of local usage history with visible coverage gaps.
- Review recent macOS diagnostic reports separately from recorded history.
- Close one selected app, process, or local OrbStack container after confirmation.
- Discover Git worktrees across providers, review branches and estimated creation dates, and remove one selected checkout while retaining its branch.
- Protect combined app rows with multiple running instances from ambiguous quit actions.
- Verify that both the worktree registration and checkout folder are gone before reporting removal success.
- Preserve partial CPU and disk measurement labels through history storage, hourly summaries, and migration of existing records.
- Bind process signals to macOS process generations and retain the validated application instance.
- Recheck container identity at the final local API boundary and observe its state after stopping, without automatic retries.
- Cancel active Git queries and serialize replacement worktree scans, including in-flight filesystem work.
- Keep zero-duration history baselines from marking complete CPU and disk totals as partial.
- Exclude macOS services and built-in Apple apps from tracking by default, with a shared scope setting for live lists, history, and diagnostics.
