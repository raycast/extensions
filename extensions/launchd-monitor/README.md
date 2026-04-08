# Launchd Monitor

Monitor your macOS launchd jobs from the menu bar. See job status, last run times, failures, and re-run jobs on demand.

## Features

- Menu bar icon showing overall job health at a glance
- View last exit status, run times, and schedule info for each job
- Re-run jobs on demand
- View recent log output for each job

## Configuration

Set the **Launchd Job Labels** preference to a comma-separated list of launchd job labels you want to monitor (e.g. `com.example.job1, com.example.job2`).

You can find your job labels by running `launchctl list` in Terminal.
