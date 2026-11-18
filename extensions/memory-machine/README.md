# Memory Machine Raycast Extension.

Control the [Memory Machine](https://memorymachine.app/) macOS app with Raycast. Open the history, search your history, and jump to settings.

## AI Extension

Use Memory Machine directly from Raycast AI Chat by mentioning `@memory-machine`.

- `Open Memory Machine Search` tool
  - Opens Memory Machine search with your query, showing results from your screen history.
  - Supports documented syntax such as quotes, `AND/OR/NOT`, parentheses, wildcard suffixes, and app filters.
- `Open Memory Machine History` tool
  - Opens the history, optionally at a specific date or timestamp.
- `Open Memory Machine Settings` tool
  - Opens Memory Machine settings.

## Commands

- `Open Search`
  - Opens Memory Machine Search using your exact query (no AI rewriting).
  - Takes one inline argument.
- `Open History`
  - Opens Memory Machine History at the latest moment.
  - Optional inline date argument supports natural language.
- `Open Settings`
  - Opens Memory Machine Settings.

## Requirements

Requires Memory Machine version 0.8.0 or later installed.

Commands and AI tools check that the Mac app is installed before opening it. If it is missing, commands offer **Get Memory Machine** and **Try Again** actions; AI tools provide a setup message with the app website.
