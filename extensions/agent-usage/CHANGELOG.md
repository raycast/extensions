# Agent Usage Changelog

## [Add Claude Usage Provider] - 2026-03-09

- Add Claude usage provider powered by Claude CLI OAuth credentials
- Fetch Claude usage from Anthropic OAuth usage endpoint (5h, weekly, model-specific, extra usage)
- Add Claude visibility preference and provider entry in Agent Usage

## [Menu Bar is Coming and Fix some bugs] - 2026-02-24

### New Features

- Add agent usage menu bar command with quick overview
- Navigate to agent detail view on click from menu bar
- Add Configure Command action in menu bar
- Add progress pie icon to list item accessories

### Improvements

- Extract shared http, hooks, format, and UI utilities for better maintainability
- Skip hidden providers execution for better performance
- Rename z.ai label to z.ai(GLM) for clarity
- Update settings URLs for Codex and Droid

### Bug Fixes

- Fix z.ai showing remaining percentage instead of used percentage

## [Initial Version] - 2026-02-20

- Track usage for Amp, Codex, Droid, Gemini CLI, Kimi, Antigravity, and z.ai
- View remaining quotas and detailed usage breakdown
- Refresh data and copy usage details to clipboard
- Customize visible agents and display order
- Amp display mode: amount or percentage
