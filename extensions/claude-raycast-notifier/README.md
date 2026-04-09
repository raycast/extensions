# AI Hook Notifier

Play focused sounds for AI CLI hook events in Raycast.

Supported providers:

- Claude Code
- Gemini CLI
- GitHub Copilot (`Done` only)

Current semantic notifications:

- `Needs Input`
- `Done`

## What It Does

- Plays a sound when the AI needs your attention
- Plays a sound when the AI finishes
- Shows a compact macOS notification
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

### Quick Install

Requirements:

- Raycast app already installed
- Node.js and `npm`

Install with:

```bash
curl -fsSL https://raw.githubusercontent.com/fulln/claude-raycast-notifier/main/scripts/bootstrap.sh | bash
```

This downloads a small bootstrap script, then downloads the latest install bundle release and installs it into `~/.ai-hook-notifier`.
It also backs up your current Claude and Gemini settings, then merges in the required hook entries.

The installer starts the extension for you.
If you ever need to start it manually:

```bash
cd ~/.ai-hook-notifier/raycast-extension
npm run dev -- --non-interactive --exit-on-error
```

### Claude Code

Configure Claude hooks so:

- `Elicitation` maps to `Needs Input`
- `Stop` maps to `Done`

Example config:
- `../config/claude-hooks.example.json`

### Gemini CLI

Configure Gemini hooks so:

- `Notification` maps to `Needs Input`
- `AfterAgent` maps to `Done`

Example config:
- `../config/gemini-settings.example.json`

### GitHub Copilot

Configure Copilot hooks so:

- `sessionEnd` with `reason: complete` maps to `Done`

Example config:
- `../config/copilot-hooks.example.json`

## Notes

- Codex is intentionally not wired yet because it does not currently expose stable native hooks for this flow.
- Antigravity is intentionally not wired yet because it does not currently expose a stable external shell hook surface for this flow.
- The extension stores managed sound data under `~/.claude-raycast-notifier` by default.
