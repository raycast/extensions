# Review & Merge

Review and merge GitHub pull requests fast: list your own PRs and your review requests, approve, and merge or enable auto-merge — each in one click.

It's organization-agnostic: by default it covers every pull request you have access to across GitHub, and you can optionally scope it to a single org or owner.

## Commands

- **My Pull Requests** — your open pull requests, **grouped by repository**. Each row shows the PR state (via the icon color) and checks status, plus an auto-merge indicator when armed. The primary action (Enter) is smart: **Merge** when the PR is mergeable now, **Enable Auto-Merge** when checks/gates are still pending, or **Open in browser** when it's stuck (conflicts, draft).
- **Review Requests** — pull requests where you're a requested reviewer and haven't reviewed yet, **grouped by repository**: open PRs awaiting your review, plus PRs closed/merged without your review in the last 30 days. Each row shows the PR state, author avatar, and checks status.

## Actions

- **Open in browser**, **Copy URL** (⌘⇧C), **Copy branch name** (⌘⇧B), **Refresh** (⌘R).
- **Approve** (⌘⇧A) — one click, via the GitHub API. Shown on other people's PRs you haven't approved yet (including merged ones, to record a review after the fact). In Review Requests it's the primary action (Enter).
- **Approve All in \<repo\>** — bulk-approve a repository's pending PRs at once (shown when a repo has 2+ approvable PRs), behind a confirmation and throttled to respect GitHub's rate limits.
- **Merge** — merges with the repository's default merge method. In Review Requests it's a manual action (⌘M) that, if the PR isn't mergeable yet, offers to enable auto-merge. In My Pull Requests it's the smart primary action described above.
- **Disable Auto-Merge** — when auto-merge is armed.

## Setup

Sign in with your GitHub account on first use. The extension requests only the scopes it needs to list, approve, and merge pull requests.

If you prefer, you can instead provide a **Personal Access Token** in the extension preferences (a classic PAT with the `repo` scope, or a fine-grained PAT with **Pull requests** read & write and **Contents** read & write).

You can optionally set **Organization or Owner** in preferences to limit results to a single GitHub org/owner. Leave it empty to include all your pull requests across GitHub.
