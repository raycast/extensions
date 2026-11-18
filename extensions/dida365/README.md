# 滴答清单 for Raycast

A Windows-only Raycast extension for controlling 滴答清单 / Dida365 tasks.

## Commands

- `Add Task`: create a task with project, due date, priority, notes, and reminder.
- `Tasks`: view open tasks grouped by list, complete tasks, and complete or reopen checklist items.
- `Today Tasks`: view tasks due today grouped by list, including checklist item actions.
- `Postpone Task`: move an existing task to another date and optional time.
- `Clipboard to Task`: create one or multiple tasks from clipboard text, with simple date/time parsing.

## Setup

The extension uses the official Dida365 API token for China-region accounts.

On first use, the extension opens the Dida365 web settings page and shows an in-Raycast guide for finding the token.

To set it up manually:

1. Open [Dida365 Web Settings](https://dida365.com/webapp#q/all/tasks?modalType=settings).
2. Go to `账户与安全`.
3. Scroll to `API 口令`.
4. Click `管理`, generate a token, and copy it.
5. Paste it into the Raycast extension preference `Dida365 API Token`.

The token is stored locally by Raycast and is only used to call the Dida365 API.

The extension also has a `Time Zone` preference. It defaults to your system time zone and can be set to `Asia/Shanghai` for Dida365 China accounts.

## Clipboard Date Parsing

`Clipboard to Task` treats each non-empty line as a task. It recognizes simple dates and times such as:

- `明天上午9点 提交报告`
- `周一 18:00 写周记`
- `2026-05-24 09:30 交作业`
- `05-24 买礼物`

## Notes

This extension targets the China-region Dida365 service at `https://api.dida365.com/open/v1`.
Due dates with times use the configured extension time zone.
