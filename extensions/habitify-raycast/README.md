# Habitify for Raycast

Manage your [Habitify](https://habitify.me) habits without leaving your keyboard.

> **Disclaimer:** This is an unofficial, community-built extension and is not affiliated with, endorsed by, or in any way officially connected to Habitify or its developers. The Habitify name and logo are property of their respective owners.

## Features

- **Today Habits** — view all of today's habits, filter by time of day or area, mark complete, skip, undo, or log a measurable amount. Habits are split into Today (daily), This Week (weekly), and This Month (monthly) sections.
- **Current Time of Day** — see only the habits due right now, with the same Today / This Week / This Month split.
- **Habit Areas** — browse your habits organised by Habitify area, with full action support.
- **Today Stats** — at-a-glance completion rates for today, this week, and this month, plus active streaks and breakdowns by time of day and area.

All commands use a stale-while-revalidate cache so they open instantly and refresh in the background.

## Requirements

- macOS with Raycast installed
- A Habitify account with API access enabled (requires a paid plan)
- Your Habitify API key — find it in **Habitify → Settings → API**

## Setup

1. Install the extension from the Raycast Store.
2. Open Raycast and run any Habitify command.
3. Paste your API key when prompted (or open **Extension Preferences** to change it later).

## Preferences

| Preference         | Description                                                                             |
| ------------------ | --------------------------------------------------------------------------------------- |
| **API Key**        | Your Habitify API key.                                                                  |
| **Row Color Mode** | Tint habit rows by status color, habit color, area color, or disable coloring entirely. |
