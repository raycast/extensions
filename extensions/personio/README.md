# Personio Raycast Extension

Track your time for [Personio](https://www.personio.de/) right from whithin Raycast.

## Getting Started

1. Obtain your company's Personio **client id** and **client secret** by asking your Personio admin. See [Personio API Reference](https://developer.personio.de/docs/getting-started-with-the-personio-api?ref=intro) for more info.
2. Select a timezone from the dropdown menu (create an issue if your timezone is not there yet)
3. Use the `Find Employee` command to copy your own **employee id** (press cmd + k an select copy).
4. Enter your employee id when you use the other commands of the extension

## Commands

### Find Employee Number

Use this command to find your employee number.

### Attendances

This command lists your attendances entered in Personio in the current year. You can select a month from the dropdown menu (cmd + p).

### Track Time

Use this command to track your times during the workday. You can enter a start time and break whenever you want. If you leave the command it will remember your entries and you can come back to them when the day ends. Then simply enter an end time and submit.

### Add Past Times

Use this command when you want to directly enter an attendance period (e.g. for a past day).
__Use Case:__
You began your day by entering a start time in the _Track Time_ function. It has come to your attention that you neglected to submit your time for yesterday. You can now rectify this oversight by using the _Add Past Times_ function, which allows you to log past hours without affecting your current entry.

