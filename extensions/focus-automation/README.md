# Focus Automation

Automate Raycast Focus sessions from your calendar. When a time block on your chosen Google Calendar begins, Focus turns on by itself and blocks your distractions.

## How it works

Connect a Google Calendar, pick which one to watch, and you're set. From then on, the moment a block starts, Raycast either asks you to begin a Focus session or starts one automatically (your choice). The session runs for the length of the event, minus a short buffer so it ends a few minutes before your next thing.

## Setup

1. Run **Set Up Focus Automation**.
2. Connect your Google account (read-only).
3. Pick the calendar to watch. A calendar you keep for focused work is ideal.

The setup screen then shows your next upcoming trigger, so you can confirm it's working.

> When connecting, Google may show an "app isn't verified" screen. Click **Advanced** at the bottom, then the link to continue to the app. The extension can only read your calendar.

## What triggers a session

- Any event **15 minutes or longer** on your chosen calendar
- Your Mac is awake and Raycast is running
- The session starts when the block starts and runs for the event's length, minus a 5-minute buffer

## When it won't start a session

Focus Automation runs quietly in the background, so it helps to know its limits:

- Events shorter than 15 minutes, and all-day events, are ignored
- If your Mac is asleep when a block begins, nothing fires. It catches up if you wake within a couple of minutes; otherwise that one is skipped
- If Raycast isn't running, nothing fires. Turn on **Launch Raycast at login** (Raycast Settings → General) so it's always ready
- Each event triggers only once

## What gets blocked

Each session automatically blocks Raycast Focus's built-in distraction categories: messaging, social, news, streaming, shopping, gaming, travel, sports, and email. Nothing to configure.

## Preferences

- **When a block begins:** Ask first (default) or Start automatically. In Ask-first mode a prompt appears; click **Start**, or it skips itself after 30 seconds.

## Privacy

Focus Automation is read-only and local.

- It uses two narrow Google scopes: read your calendar list and read events. It **cannot edit your calendar** or touch anything else in your Google account.
- It reads only event titles and times.
- It runs entirely on your Mac. The only network request is to Google Calendar, to read your upcoming events. There are no third-party servers and no analytics.
- Your Google sign-in is stored securely in the macOS Keychain through Raycast.

## Requirements

- macOS with Raycast, including the Focus feature
- A Google account
