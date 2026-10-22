# Local Time Tracker

Track project work entirely inside Raycast. Local Time Tracker uses no server, external API, or external database.

## Features

- Manage client and internal projects
- Mark one project as preferred for faster timer starts
- Start and stop a single active timer
- Plan daily goals with optional handwritten subtasks, and start, switch, stop, or complete tasks from Today's Plan
- Organize related projects into named project groups
- Keep task descriptions optional and reuse recent descriptions for each project
- See elapsed time in the menu bar
- Search, edit, delete, and manually add work logs
- Edit work-log start and end times to the minute, or correct a running timer's start time
- Review today, this week, or this month
- Break totals down by project and project group
- View Reports charts in Raycast’s light or dark appearance
- Split work accurately across day, week, and month boundaries

## Getting Started

1. Open **Projects** and add the project groups and projects you work with.
2. Optionally mark a project as preferred so it is selected first in **Start Work**.
3. Open **Start Work**, choose a project, check its **Project Group**, and optionally enter a task description.
4. Open **Menu Bar Timer** once to enable the menu bar item and background refresh.

After a timer starts successfully, Raycast closes and resets to an empty Root Search for the next launch. Open **Start Work** again to view **Tracking Work**, stop the timer, or edit its start time.

You can set global shortcuts for **Start Work** and **Stop Work** in Raycast Settings. Suggested shortcuts:

```text
Start Work  ⌥⌘T
Stop Work   ⌥⌘S
```

## Projects and Project Groups

A **Project Group** is a named collection of related projects, such as Client, Internal, or Personal. Each project belongs to one group; a group can contain multiple projects. Work timers and logs belong to individual projects, and Reports can summarize time for either one project or its group.

Create and manage groups in **Projects**. In **Start Work**, the selected project's group appears above the project picker. This is a read-only label that updates when you choose a different project; it does not select or change the project's group.

## Today's Plan

Use **Today's Plan** to choose daily goals, write optional subtasks, and track progress inside Raycast. Parent goals show completion counts and total time. Tasks show completion icons, tracked time, and a Running tag. Goals without subtasks are also trackable.

Selecting a parent goal and pressing **Return** opens its editor; **⌘Return** toggles completion of all its visible children. Select a task with **↑ / ↓**, or **Control+N / Control+P** when Raycast's Emacs navigation bindings are enabled. **Return** starts or stops the selected task; **⌘Return** toggles completion. Starting another task saves the current timer first. Completing the running task stops and saves its time. Completed tasks must be marked incomplete before tracking again. Closing Raycast leaves a running timer active.

Use **New Plan** (**⌘N**) to add a goal, or **Edit Plan** (**⌘E**) on an existing item. The empty view offers New Plan; edit and sort actions are available only when a plan exists. Enter the goal on the first line and each subtask on a following line in the same text area, select a project, and choose **Save Plan** (**⌘Return**). A single line creates a goal without subtasks. There is no fixed limit; about three goals is a useful starting point.

```text
Finish the contact form
Choose input fields
Implement validation
Connect submission
```

The Plan dropdown in the editor switches between New Plan and existing goals. Unchanged task lines retain their identity through reordering and insertion; edits to the same number of remaining lines are treated as renames in line order. Work Logs remain saved when a goal is deleted. Stop a running task before removing its line or changing its goal's project. Stop a running goal without subtasks before adding child tasks. The editor rejects stale saves rather than overwriting newer changes.

Open **Sort Subtasks** (**⌘S**) for a goal's children or **Sort Plans** (**⌘⇧S**) for the parent goals. For a standalone goal, **⌘S** opens Sort Plans. In either sorting list, **↑ / ↓** or **Control+N / Control+P** selects an item, and **⌘⌥↑ / ⌘⌥↓** moves it up or down among its siblings. Order saves immediately. **Return** finishes sorting; **Escape** navigates back according to Raycast's Escape setting. A parent sorting row also offers Sort Subtasks. Timers continue during sorting. Standard list rows do not have clickable checkboxes or drag-and-drop sorting; use **⌘Return** or the action panel (**⌘K**) for completion. Action shortcuts appear in Raycast's action panel.

From today's list, press **⌘⇧I** or choose **Import Latest Plan** in Actions to bring forward unfinished plans from the most recent earlier date that still has tasks. Empty days, including weekends, are skipped. Every incomplete parent on that one date moves with all its children, including completed steps, preserving their completion states and order. Existing plans for today remain, and imported plans follow them in their previous order. Fully completed parents stay on the earlier date. If the latest date is fully complete, nothing is imported; the action does not reach back to older dates. Importing is always manual, without a date picker or confirmation step. The action remains available when there are no past tasks, and a notification explains that nothing remains to import. Importing moves plans rather than copying them, so an imported plan is no longer on its earlier date.

The date dropdown still opens earlier plans. To move an individual plan, select it or any of its subtasks on an earlier date and choose **Move Plan to Today** (**⌘⇧T**). An unfinished plan without subtasks can also move. The list switches to today after the move. Today's task times include only work recorded today. Historical logs, reports, and running timers stay intact. Moved-from dates remain available even when empty.

Starting work from Today's Plan starts a regular timer. To use Pomodoro with that task, enable Pomodoro in preferences, then choose **Start Pomodoro** from **Menu Bar Timer** while the task's timer is running.

When a goal has children on multiple dates, each date shows its own children. Editing, sorting, completing, or deleting a day's goal affects those children only; the goal name and project remain shared. To replace all of one day's children with a standalone goal while other dates retain children, delete that day's goal and add a new standalone goal. Tasks are never carried automatically.

Times are split at local midnight, consistent with Reports; totals include work started from other commands. Tracked time refreshes while the view is open, and today's list rolls over to the new day at local midnight.

## Reports

Reports shows **Today**, **This Week**, or **This Month**, with totals and session counts for the overview, a project group, or an individual project. Today includes only today's time: a new day starts with zero until you track work. Earlier logs remain available in This Week, This Month, and **Work Logs**.

The visual summary includes project mix, the last seven days, and 35-day activity. The daily charts keep their own rolling windows, so they can show earlier activity even when Today is zero. Expand the project list to see more than two projects. The card follows Raycast's light or dark appearance; after changing Raycast's theme while Reports is open, return to the root search and reopen Reports to refresh its appearance.

## Editing Work Times

In **Work Logs**, open a log and choose **Edit Work Log** to adjust start and end times in a numeric preview. A trailing ← marks the selected Start or End row without shifting either row when focus changes; times use a fixed-width typeface, current start/end times update immediately, and the sidebar shows project details. **Add Work Log** opens the same preview. Start time is selected initially. Press **↑** to focus Start or **↓** to focus End without saving. Use **← / →** to move the selected time by 1 minute, or **⇧← / ⇧→** for 1 hour. Press **Return** to save from either Start or End; the save action is shown in the bottom-right corner. You can also choose **Adjust End Time** / **Adjust Start Time** in Actions or press **⌘T** to switch. Adjustments are also available in the Actions menu.

For a precise date or minute, choose **Enter Exact Time** from Actions. Enter the start and end dates and 24-hour `HH:mm` times, then choose **Apply to Preview** to return to the numeric preview. Reopening exact input retains the applied times; going back without applying leaves the preview unchanged. Choose **Edit Project and Description** to change those fields in the same way. **Return**, or **Save Work Log** / **Add Work Log** from Actions, writes the record; leaving the preview discards unsaved changes.

Use separate dates for work spanning midnight. End time must be after start time and cannot be later than the current time; logs longer than 24 hours require confirmation. Unchanged timestamps retain their seconds. Relative adjustments retain seconds, except that moving End into the current minute caps any future seconds at the current time; later minutes remain rejected. For other relative adjustments, exactly the requested minutes are added; changing a date or time through exact input sets its seconds to zero. The preview uses Raycast's native text appearance and updates numbers immediately, without a bar or image replacement. For a running timer, elapsed time also refreshes while the editor is open.

If you forgot to start tracking, start the timer normally, reopen **Start Work**, and choose **Edit Start Time** from the Actions menu. The action is also available in reminder windows while the timer is running. Adjust the start using **← / →** or **Enter Exact Time**, then press **Return** to save. A running timer has no end step; you can also choose **Save Start Time** from Actions. Future starts are rejected, and a start at least 24 hours ago requires confirmation. The corrected start appears in the menu bar, Reports, and the log saved when you stop. If the timer stops or another screen changes its start time while you edit, saving is rejected; reopen Start Work to load the current state.

Editing work time leaves Pomodoro's remaining time, current interval, and completed intervals unchanged. **Work Timer Alert** uses the corrected elapsed time: if an undelivered alert is now overdue, it is sent on the next successful reminder check. An already delivered alert does not repeat.

## Storage and Privacy

Projects, daily goals and subtasks, work logs, and the active timer are stored as JSON in Raycast `LocalStorage`.

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
