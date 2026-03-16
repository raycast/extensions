# RayEngineer

Track time on Jira issues directly from Raycast. Start a timer, work on your task, and log the time back to Jira when you're done -- no need to leave your keyboard.

## Setup

You'll need three things to get started:

1. **Jira URL** -- Your Atlassian instance URL, something like `https://yourcompany.atlassian.net`
2. **Jira Email** -- The email address you use to log into Jira
3. **Jira API Token** -- Generate one at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

Open any RayEngineer command for the first time and Raycast will prompt you to fill these in.

## Commands

### Browse Tasks

Lists your assigned and recently viewed Jira issues. Pick one to start tracking time on it. If the issue isn't in "In Progress" yet, the extension will offer to transition it for you. Same goes for unassigned issues -- it'll offer to assign them to you automatically.

### Start Timer

Reads a Jira issue key from your clipboard (like `PROJ-123` or a full Jira URL) and starts a timer right away. Handy when you're already looking at an issue in the browser and want to start tracking without searching for it.

### Stop Timer

Opens a form where you can review and adjust the tracked time before logging it to Jira. You can tweak the duration manually (supports formats like `1h30m`, `45m`, `2h`), bump it up or down in 5-minute increments, or discard the entry entirely. If your Jira workflow supports it, you can also transition the issue to a "Done" status from here.

### Menu Bar Timer

Sits in your menu bar and shows the currently running timer with a live elapsed time counter. From there you can pause, resume, open the issue in Jira, or stop and log the time.

## How It Works

Time is tracked locally on your machine using Raycast's built-in storage. Nothing is sent to Jira until you explicitly log a worklog. Tracked durations are rounded up to the nearest 10-minute block before logging, which is a common practice for Jira time tracking.

The extension uses Jira's REST API v3 with basic authentication (email + API token). It only reads your assigned/recent issues and writes worklogs -- it doesn't modify anything else in your Jira instance.
