# Clocky

Clocky helps you keep track of your work hours in a simple and flexible way. Clock in, clock out, track breaks, and monitor your daily or weekly time balance — perfect for flexible working hours and trust-based schedules.

## Commands

### Clock In

Starts tracking your work time and records your current session start.

### Clock Out

Stops tracking and calculates your total working time for the session, including breaks and your daily delta against target hours.

### Toggle Pause

Pauses or resumes your current session. Pause time is tracked automatically and subtracted from your worked hours.

### Today

Shows how many hours you've worked today, how much break time you've taken, and your current delta against today's target hours.

### Week

Displays your weekly working time, a daily breakdown, and your overall time balance (plus or minus hours) against your weekly target.

### Status

A menu bar command showing your current state — working, paused, or off — with a live time delta for today. It can also flag when you likely forgot to clock in or clock out, based on your configured thresholds.

### Adjust Entries

Lets you add, edit, or delete sessions and pauses to keep your time records accurate — useful for correcting a forgotten clock-out or backfilling a session you forgot to start.

## Preferences

| Preference | Default | Description |
| --- | --- | --- |
| Weekly Target Hours | `40` | Your planned working hours per week. Used to calculate your daily and weekly time balance. |
| Work Days per Week | `5` | How many days you typically work each week. Used together with your weekly target to derive a daily target. |
| Forgot Clock Out After (minutes) | `15` | How long your computer must have been asleep before **Status** suggests you forgot to clock out. |
| Forgot Clock In After (minutes) | `30` | How long you can be awake without an active session before **Status** suggests you forgot to clock in. |
