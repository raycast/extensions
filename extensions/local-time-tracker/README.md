# Local Time Tracker

Track project work entirely inside Raycast. Local Time Tracker uses no server, external API, or external database.

## Features

- Manage client and internal projects
- Mark one project as preferred for faster timer starts
- Start and stop a single active timer
- Choose from registered project categories
- Keep task descriptions optional and reuse recent descriptions for each project
- See elapsed time in the menu bar
- Search, edit, delete, and manually add work logs
- Review today, this week, or this month
- Break totals down by project and project type
- Split work accurately across day, week, and month boundaries

## Getting Started

1. Open **Projects** and add the categories and projects you work with.
2. Optionally mark a project as preferred so it is selected first in **Start Work**.
3. Open **Start Work**, choose a project, and optionally enter a task description.
4. Open **Menu Bar Timer** once to enable the menu bar item and background refresh.

You can set global shortcuts for **Start Work** and **Stop Work** in Raycast Settings. Suggested shortcuts:

```text
Start Work  ⌥⌘T
Stop Work   ⌥⌘S
```

## Storage and Privacy

Projects, work logs, and the active timer are stored as JSON in Raycast `LocalStorage`.

- Work data never leaves the Mac through this extension.
- No analytics, network requests, or external services are used.
- Data is not synchronized between Macs.
- Removing the extension or clearing its Raycast data may permanently remove work logs.
- Export and import are not included in the current version.

## Time Alerts and Pomodoro

Local Time Tracker runs entirely on your Mac, using Raycast LocalStorage with no external services.

In the extension preferences, enable **Daily Work Alert** and/or **Work Timer Alert** and enter a threshold in minutes (480 minutes = 8 hours). Both alerts are disabled by default. The daily total uses the same local calendar day and calculation as Reports, including saved work logs and the running timer. Notifications are sent once per local day or work timer; changing a threshold or editing logs does not reset an already delivered notification.

The **Pomodoro** section in extension preferences has an **Enable Pomodoro** switch (on by default), separate from the daily and work-timer alert sections. Disabling it ends the Pomodoro overlay on the next menu bar refresh without stopping work tracking. Select **Use Pomodoro alongside work tracking** in Start Work, or choose **Start Pomodoro** from the running timer's menu bar. Defaults are 25 minutes of work, 5 minutes of short break, and a 15-minute long break after every 4 completed work intervals. All values are configurable in extension preferences. Enter positive whole numbers up to 525600; invalid values use the documented defaults. Changes apply when the next interval starts.

At the end of an interval, Raycast opens a silent **Pomodoro Finished** window in the foreground, even when its main window was closed. The message stays visible until you dismiss it or choose **Start Short Break**, **Start Long Break**, or **Start Work**. This uses the existing Start Work command; keep that command enabled. Raycast controls the window position. Daily and work-timer alerts continue to use Toast/HUD notifications. The menu bar keeps the finished state visible until you manually start the next interval. There is no automatic transition. **End Pomodoro** stops only the Pomodoro overlay; **Stop Work** stops both. The work timer continues through breaks and while waiting for the next interval, so all that time remains included in work logs and alerts.

Open **Menu Bar Timer** once and keep its background refresh enabled in Raycast Settings. Checks run at the existing one-minute interval. [Raycast background scheduling](https://developers.raycast.com/information/lifecycle/background-refresh) is approximate and can be delayed, especially on battery or after sleep. Raycast must be running; enable Launch Raycast at Login if you want checks after logging in. No notification can be delivered while Raycast is quit or the Mac is asleep. On the next check after wake or restart, overdue intervals remain waiting for your action, and failed notifications are retried. The menu bar displays reminder-check errors; reached alerts are delivered as notifications only.
