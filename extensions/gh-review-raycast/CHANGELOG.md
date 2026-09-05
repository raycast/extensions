# Flex Review Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Pull Requests command with colour-coded categories: needs my review, my
  team's review, my open PRs, awaiting my reply, and watched repositories.
- Saved filters, composed from fields or written as a raw GitHub search string,
  appearing alongside the built-in categories.
- Ageing metrics on every pull request — how long it's been open, how long
  it's been untouched, and how long someone has been waiting on you — with
  fresh/aging/stale/stalled bands, a per-category summary, and sorting by
  longest wait or longest silence.
- Anything awaiting your reply opens directly at the comment — from the list,
  the menu bar, the Activity Inbox, and notification banners alike.
- Attention signals covering both inline review threads and the pull request
  conversation, so a question asked in the PR body counts as awaiting your
  reply. Comments from ignored authors are skipped, keeping bot chatter out.
- A detail pane in the pull request list (`⇧⌘D`) with labels, reviewers,
  assignees, diff size, and conversation state — no extra requests.
- Menu bar overflow moved into a "N more" submenu, with the inline count
  configurable, plus a "Checked N ago" row.
- New-since-last-look tracking, so PRs with fresh activity are tagged.
- Reply to review threads, resolve/unresolve them, and post conversation
  comments without leaving Raycast.
- Background watcher that checks GitHub on a schedule and records new review
  requests, comments, and replies — with desktop banners off by default,
  per-kind switches, quiet hours, a per-check banner cap, and a sound toggle.
- Activity Inbox: a rolling 72-hour record of what the watcher found, with the
  actual comment text in the detail pane.
- Filterable pull request timeline (text search, date range, day grouping),
  mirroring the web dashboard's timeline modal.
- Author ignore list, seeded with the usual bots (Dependabot, Renovate, …).
- Organization, repository, and team pickers.
- Menu bar command with a live count of what's waiting on you.
- Authentication borrowed from the local `gh` CLI — no token to manage.
- One-click **Sign in to GitHub**, which opens Terminal with `gh auth login`
  already running.
- SAML-aware error handling: a search that spans organizations keeps the
  results GitHub did return and flags the organization that refused, with a
  direct authorize link taken from GitHub's `X-GitHub-SSO` header.
- A setup gate on every command: until the CLI is installed, authenticated, and
  reachable, each command shows step-by-step instructions with copyable
  commands and a "Check Again" action instead of its normal UI.
