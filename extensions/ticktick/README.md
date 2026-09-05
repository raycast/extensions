# TickTick Extension

Use Raycast to create, find, and complete tasks in the TickTick macOS app.

## Quick Add Syntax

The **Quick Add Task** command recognizes a practical subset of TickTick's quick-add syntax:

| Input                             | Result                             |
| --------------------------------- | ---------------------------------- |
| `Call the client tomorrow at 9am` | Timed task due tomorrow at 9:00 AM |
| `Review the report next Monday`   | All-day task due next Monday       |
| `Send the invoice at 4pm`         | Timed task due today at 4:00 PM    |
| `Submit expenses *2026-08-25`     | All-day task due August 25, 2026   |
| `Prepare agenda ~Client Work`     | Task in the `Client Work` list     |
| `Fix production issue !high`      | High-priority task                 |

Both `~List Name` and `^List Name` select a list. Priorities can be written as `!high`, `!medium`,
`!low`, `!1`, `!2`, `!3`, or `!none`. Date-only phrases create all-day tasks, while a time without a date
means today. Natural-language dates and times are previewed for confirmation before the task is created;
dates and times prefixed with `*` are treated as explicit and created immediately.

Tags, recurring dates, and assignees are not parsed because the TickTick macOS AppleScript interface does
not expose those fields when creating a task.
