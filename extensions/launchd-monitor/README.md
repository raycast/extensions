# Launchd Monitor

Monitor your macOS launchd jobs from the menu bar. See job status, last run times, failures, and re-run jobs on demand.

## Features

- Menu bar icon showing overall job health at a glance
- View last exit status, run times, and schedule info for each job
- Currently-running detection via PID
- Supports both `StartCalendarInterval` and `StartInterval` schedules
- Re-run jobs on demand (system daemons prompt for admin password)
- View recent log output for each job

## Job Domains

The extension monitors jobs across all standard launchd domains:

- User agents in `~/Library/LaunchAgents`
- System agents in `/Library/LaunchAgents`
- System daemons in `/Library/LaunchDaemons`

Re-running a system daemon requires root, so the extension uses the standard
macOS authorization prompt. User-domain agents re-run silently.

## Configuration

Set the **Launchd Job Labels** preference to a comma-separated list of launchd job labels you want to monitor (e.g. `com.example.job1, com.example.job2`).

You can find your job labels by running `launchctl list` in Terminal.
