# GitHub Enterprise Pull Requests Manager

Manage your GitHub pull requests directly from Raycast — track approvals, CI status, merge conflicts, comments, and review requests. Supports both GitHub Enterprise and GitHub.com.

## Commands

- **All Pull Requests** — everything in one view with a category filter dropdown
- **My Pull Requests** — PRs you authored or are assigned to
- **Reviewing** — PRs where you are requested as a reviewer

## Categories

### My Pull Requests

| Category | Description |
|---|---|
| **Wait For Merge** | At least one approval, no changes requested |
| **Wait For Change** | At least one reviewer requested changes |
| **Wait For Review** | No reviews yet (filtered by label if configured) |
| **Parked** | Draft PRs and PRs missing the configured label |

### Reviewing

| Category | Description |
|---|---|
| **New Review Request** | You haven't commented or reviewed yet |
| **In Review** | You've already commented or submitted a review |

## What you see per PR

Each pull request displays inline:

- **Approvals** — number of approved reviews
- **CI status** — passing, failing, or pending checks (with failing check names on hover)
- **Merge conflict** — highlighted when the branch is behind or has conflicts
- **Comments** — number of comments on the PR
- **Author avatar** — with the author's username
- **Last updated** — relative time of the last update

## Actions

- **Open in Browser** — open the PR on GitHub (`↵`)
- **Toggle Detail** — show/hide the detail panel (`⌘D`)
- **Copy PR URL** (`⌘⇧C`)
- **Copy PR Number** (`⌘⇧N`)
- **Approve** (`⌘⇧A`)
- **Request Changes** — opens a form to write a review comment (`⌘⇧R`)
- **Refresh** (`⌘R`)

## Configuration

| Preference | Required | Description |
|---|---|---|
| **GitHub URL** | Yes | `https://github.com` or your enterprise instance URL |
| **Personal Access Token** | Yes | Token with `repo` and `read:org` scopes |
| **Filter by Label** | No | Only show PRs with this label in Wait For Review. Separate multiple labels with commas (e.g. `my-team, 🚀 feature`) |

### Creating a Personal Access Token

Go to `Settings → Developer settings → Personal access tokens` on your GitHub instance and create a token with:

- `repo` — to read pull requests and review status
- `read:org` — to search within your organization
