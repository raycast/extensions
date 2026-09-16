# Resource Inspector Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Inspect physical memory, CPU, disk activity, memory pressure, compression, and swap.
- Record seven days of local usage history with visible coverage gaps.
- Review recent macOS diagnostic reports separately from recorded history.
- Close one selected app, process, or local OrbStack container after confirmation.
- Discover Git worktrees across providers, review branches and estimated creation dates, and remove one selected checkout while retaining its branch.
- Protect combined app rows with multiple running instances from ambiguous quit actions.
- Verify that both the worktree registration and checkout folder are gone before reporting removal success.
- Preserve partial CPU and disk measurement labels through history storage, hourly summaries, and migration of existing records.
