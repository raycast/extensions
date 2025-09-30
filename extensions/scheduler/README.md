# Command Scheduler ⏰

This extension allows you to schedule any Raycast command to run automatically at specific times or intervals. Perfect for automating repetitive tasks, running periodic checks, or executing AI commands on a regular basis.

## Flexible Scheduling Options

- **One-time**: Run a command once at a specific date and time
- **Interval-based**: Execute commands every 15 minutes, 30 minutes, or hourly
- **Daily**: Run commands at the same time every day
- **Weekly**: Schedule commands for specific days of the week
- **Monthly**: Execute commands on a particular day of each month
- **Custom Cron**: Use cron expressions for complex, highly specific schedules

## Schedule Management

- **View & Filter**: See all your scheduled commands with filtering by schedule type
- **Enable/Disable**: Easily toggle commands on or off without deleting them
- **Edit Schedules**: Modify existing scheduled commands anytime
- **Execution Logs**: Track when commands run and view any errors

## Creating a Scheduled Command

### Enter Details

- **Name**: Give your scheduled command a descriptive name
- **Command**: Paste the Raycast deeplink of the command you want to schedule
- **Schedule Type**: Choose from the available scheduling options
- **Timing**: Set the specific time, date, or interval details
- **Background Mode**: Toggle whether the command should run in background

### Getting Command Deeplinks

To grab Raycast command:

1. Find the command you want to schedule in Raycast
2. Press `Cmd+Shift+C` (or `Ctrl+Shift+C` on Windows), or right-click the command and choose "Copy Deeplink"
3. Paste this deeplink into the scheduler

## Schedule Types

| Type              | Description                                | Example Use Cases                                    |
| ----------------- | ------------------------------------------ | ---------------------------------------------------- |
| **One-time**      | Execute once at a specific date and time   | Meeting reminders, deadline alerts                   |
| **15/30 minutes** | Run every 15 or 30 minutes                 | AI model checks, quick status updates                |
| **Hourly**        | Execute every hour                         | System monitoring, regular backups                   |
| **Daily**         | Run at the same time every day             | Morning briefings, daily reports                     |
| **Weekly**        | Execute on specific days of the week       | Weekly summaries, maintenance tasks                  |
| **Monthly**       | Run on a specific day each month           | Monthly reports, billing reminders                   |
| **Custom Cron**   | Use cron expressions for complex schedules | "Tuesdays and Fridays at 9 AM", "Every 2 hours on weekends" |

## Troubleshooting

### Command Not Executing?

1. Check if the command is enabled in your scheduled commands list
2. Verify the deeplink is correct by testing it manually in Raycast
3. Review execution logs for error messages

### Permission Issues?

Some commands may require permissions that need to be granted when they first run. Check the execution logs for permission-related errors.

### Viewing Logs

Use "View Execution Logs" to see:

- When commands were executed
- Success/failure status
- Error messages for failed executions
- Command execution history

## Open Source Acknowledgments

This extension leverages the following open-source libraries:

- **cron-parser** (MIT License) – Parses cron expressions and computes next execution times. https://github.com/harrisiirak/cron-parser
- **cronstrue** (MIT License) – Generates human‑readable descriptions from cron expressions. https://github.com/bradymholt/cRonstrue

**Big-up to the maintainers and contributors of these neat projects.** 🙏🏽
