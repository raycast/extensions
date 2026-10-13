# Local Time Tracker

Track project work entirely inside Raycast. Local Time Tracker uses no server, external API, or external database.

## Features

- Manage client and internal projects
- Mark one project as preferred for faster timer starts
- Start and stop a single active timer
- Organize related projects into named project groups
- Keep task descriptions optional and reuse recent descriptions for each project
- See elapsed time in the menu bar
- Search, edit, delete, and manually add work logs
- Review today, this week, or this month
- Break totals down by project and project group
- View Reports charts in Raycast’s light or dark appearance
- Split work accurately across day, week, and month boundaries

## Getting Started

1. Open **Projects** and add the project groups and projects you work with.
2. Optionally mark a project as preferred so it is selected first in **Start Work**.
3. Open **Start Work**, choose a project, check its **Project Group**, and optionally enter a task description.
4. Open **Menu Bar Timer** once to enable the menu bar item and background refresh.

You can set global shortcuts for **Start Work** and **Stop Work** in Raycast Settings. Suggested shortcuts:

```text
Start Work  ⌥⌘T
Stop Work   ⌥⌘S
```

## Projects and Project Groups

A **Project Group** is a named collection of related projects, such as Client, Internal, or Personal. Each project belongs to one group; a group can contain multiple projects. Work timers and logs belong to individual projects, and Reports can summarize time for either one project or its group.

Create and manage groups in **Projects**. In **Start Work**, the selected project's group appears above the project picker. This is a read-only label that updates when you choose a different project; it does not select or change the project's group.

## Reports

Reports shows **Today**, **This Week**, or **This Month**, with totals and session counts for the overview, a project group, or an individual project. Today includes only today's time: a new day starts with zero until you track work. Earlier logs remain available in This Week, This Month, and **Work Logs**.

The visual summary includes project mix, the last seven days, and 35-day activity. The daily charts keep their own rolling windows, so they can show earlier activity even when Today is zero. Expand the project list to see more than two projects. The card follows Raycast's light or dark appearance; after changing Raycast's theme while Reports is open, return to the root search and reopen Reports to refresh its appearance.

## Storage and Privacy

Projects, work logs, and the active timer are stored as JSON in Raycast `LocalStorage`.

- Work data never leaves the Mac through this extension.
- No analytics, network requests, or external services are used.
- Data is not synchronized between Macs.
- Removing the extension or clearing its Raycast data may permanently remove work logs.
- Export and import are not included in the current version.

## Time Alerts and Pomodoro

Local Time Tracker runs entirely on your Mac, using Raycast LocalStorage with no external services.

In the extension preferences, enable **Work Timer Alert** and enter a threshold in minutes (480 minutes = 8 hours). The alert is disabled by default and is sent once per work timer. Changing the threshold does not reset an already delivered notification. A notification delivery failure or damaged Pomodoro state does not disable unrelated reminders.

The **Pomodoro** section in extension preferences has an **Enable Pomodoro** switch (on by default), separate from the work-timer alert section. Disabling it ends the Pomodoro overlay on the next menu bar refresh without stopping work tracking. Select **Use Pomodoro alongside work tracking** in Start Work, press **⌘⇧P** to toggle it without leaving the current field, or choose **Start Pomodoro** from the running timer's menu bar. The shortcut is shown beside the checkbox and in the Actions menu. Defaults are 25 minutes of work, 5 minutes of short break, and a 15-minute long break after every 4 completed work intervals. All values are configurable in extension preferences. Enter positive whole numbers up to 525600; invalid values use the documented defaults. Changes apply when the next interval starts.

At the end of an interval, Raycast opens a silent **Pomodoro Finished** window in the foreground, even when its main window was closed. The message stays visible until you dismiss it or choose **Start Short Break**, **Start Long Break**, or **Start Work Interval**. After dismissing a completion window, reopen **Start Work** and press **Return** to start the next interval; no new command is needed. All reminder windows use the existing Start Work command; keep that command enabled. Raycast controls the window position. Work-timer alerts also open a persistent foreground window with a **Dismiss** action; dismissing an alert does not stop work tracking. When time alerts and Pomodoro finish together, they appear in the same window. The menu bar keeps the finished state visible until you manually start the next interval. There is no automatic transition. **End Pomodoro** stops only the Pomodoro overlay; **Stop Work** stops both. The work timer continues through breaks and while waiting for the next interval, so all that time remains included in work logs and alerts.

Open **Menu Bar Timer** once and keep its background refresh enabled in Raycast Settings. Checks are scheduled every 15 seconds to keep the countdown current. [Raycast background scheduling](https://developers.raycast.com/information/lifecycle/background-refresh) is approximate and can be delayed, especially on battery or after sleep. Raycast must be running; enable Launch Raycast at Login if you want checks after logging in. No notification can be delivered while Raycast is quit or the Mac is asleep. On the next check after wake or restart, overdue intervals remain waiting for your action, and failed notifications are retried. The menu bar displays reminder-check errors; reached alerts are delivered as notifications only.
