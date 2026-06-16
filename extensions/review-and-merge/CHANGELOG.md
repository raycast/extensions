# Review & Merge Changelog

## [Menu Bar] - {PR_MERGE_DATE}

- Added a **Pull Requests Menu Bar** command: a passive menu-bar list of PRs awaiting your review and your own open PRs, with a badge counting review requests.
- Approve, merge, or enable auto-merge directly from the menu (merge asks for confirmation only when non-required checks are failing).
- Background refresh every minute (can be turned on or off from the command settings).

## [Initial Version] - {PR_MERGE_DATE}

- List your open pull requests, grouped by repository, with PR state, checks status, and auto-merge indicator.
- List pull requests awaiting your review, grouped by repository, including ones closed or merged without your review in the last 30 days.
- Smart primary action: merge when ready, enable auto-merge when checks are pending, or open in browser when blocked.
- Approve a single pull request or bulk-approve all pending pull requests in a repository.
- Disable auto-merge, copy URL, copy branch name, and open in browser actions.
- Optional scoping to a single organization or owner.
