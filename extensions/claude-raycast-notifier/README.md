# AI Hook Notifier

Play focused sounds for AI CLI hook events in Raycast.

Supported providers:

- Claude Code
- Gemini CLI

Current semantic notifications:

- `Needs Input`
- `Done`

## What It Does

- Plays a sound when the AI needs your attention
- Plays a sound when the AI finishes
- Opens a compact Raycast notification
- Keeps notification text minimal: provider + status

## Commands

- `Manage Hook Sounds`
  Configure the two semantic sounds: `Needs Input` and `Done`
- `Notify AI Event`
  Internal callback command used by the hook bridge scripts

## Default Sounds

The extension ships with bundled defaults:

- `Claude Ready To Work`
- `Claude Jobs Done`

You can change them at any time from `Manage Hook Sounds`.

## Setup

### Claude Code

Configure Claude hooks so:

- `Elicitation` maps to `Needs Input`
- `Stop` maps to `Done`

Example config:
- [config/claude-hooks.example.json](/Users/fulln/opensource/claude-raycast-notifier/config/claude-hooks.example.json)

### Gemini CLI

Configure Gemini hooks so:

- `Notification` maps to `Needs Input`
- `AfterAgent` maps to `Done`

Example config:
- [config/gemini-settings.example.json](/Users/fulln/opensource/claude-raycast-notifier/config/gemini-settings.example.json)

## Notes

- Codex is intentionally not wired yet because it does not currently expose stable native hooks for this flow.
- The extension stores managed sound data under `~/.claude-raycast-notifier` by default.
