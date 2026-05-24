# Drone Builds Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Browse recent Drone CI builds in a List view with status, branch, author, duration and commit message metadata.
- Push to a stages/steps view on any build to inspect pipeline progress, exit codes and per-step duration without leaving Raycast.
- Push to a log view on any step to see the tail of the step's output as code-block markdown, with one-shortcut copy-to-clipboard.
- Background poller (1-minute interval) that detects terminal-state transitions and fires native macOS Notification Center banners via `terminal-notifier` (with `osascript` fallback).
- Smart notifications: failure-streak grouping ("🔥 N in a row") and one-shot long-running alerts past a configurable threshold.
- Quick-action commands: Restart My Last Failed Build, Cancel My Latest Running Build (with confirmation), Open Drone Server, Run Drone Cron Job.
- Run Drone Cron Job: pick a repo, pick a cron and trigger it (equivalent to `POST /api/repos/{slug}/cron/{name}`).
- "Mine" filter (sender / author_login / author_email) plus per-repo include/exclude lists.
- Demo Mode preference: deterministically redact slugs, authors, branches, commit messages and cron names for safe screenshots.
