# GitHub Enterprise Pull Requests Changelog

## [Label Filter Everywhere and Incoming Section] - {PR_MERGE_DATE}

- Label filter now applies to all your PRs: PRs missing the label go to Parked, even if already approved or with changes requested
- Label filter now applies to review requests: requests missing the label go to a new **Incoming** section at the bottom
- Label matching is now case-insensitive, like GitHub

## [Label Filter and Parked Section] - {PR_MERGE_DATE}

- Add optional **Filter by Label** preference — when set, only PRs with that label appear in Wait For Review
- Add **Parked** section at the bottom for draft PRs and PRs missing the configured label
- When no label is configured, draft PRs are automatically moved to Parked

## [Three Commands and Sort Fix] - {PR_MERGE_DATE}

- Split into three dedicated commands: All Pull Requests, My Pull Requests, Review Requests
- Fix sort order for PRs where you are assigned but not the author — all categories now sort by last update, newest first

## [Initial Version] - {PR_MERGE_DATE}

- My Pull Requests with categories: Wait For Merge, Wait For Change, Wait For Review
- Review Requests with categories: New Review Request, In Review
- Approval and CI status displayed inline
- Approve and Request Changes actions
