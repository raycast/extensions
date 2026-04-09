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
- `Setup Hooks`
  Check Claude / Gemini hook health and install hook config directly from Raycast
- `Notify AI Event`
  Internal callback command used by the hook bridge scripts

## Default Sounds

The extension ships with bundled defaults:

- `Claude Ready To Work`
- `Claude Jobs Done`

You can change them at any time from `Manage Hook Sounds`.

## Setup

There are two supported setup paths:

- `Shell installer`: configures hooks automatically
- `Raycast install only`: requires one extra `Setup Hooks` step inside Raycast

### Quick Install

Requirements:

- Node.js and `npm`
- macOS with Raycast for the full extension experience

Platform behavior:

- macOS: full install, including Raycast startup
- Linux: hook-only install; the extension is not started
- Native Windows: unsupported by the installer

Install with:

```bash
curl -fsSL https://raw.githubusercontent.com/fulln/claude-raycast-notifier/main/scripts/bootstrap.sh | bash
```

This downloads a small bootstrap script, then downloads the latest install bundle release and installs it into `~/.ai-hook-notifier`.
It also backs up your current Claude and Gemini settings, then merges in the required hook entries.

On macOS, if Raycast is installed, the installer also starts the extension for you.
On Linux, the installer stops after hook setup and skips Raycast startup.
On native Windows, the installer exits before downloading the bundle.

If you install the extension directly from Raycast instead of using the shell
installer, run `Setup Hooks` once. It copies the bundled hook runtime into
`~/.claude-raycast-notifier/generated-hooks` and updates:

- `~/.claude/settings.json`
- `~/.gemini/settings.json`

Without `Setup Hooks`, the extension commands are installed, but Claude and
Gemini will not automatically route hook events or questions into Raycast.

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

- The installer is macOS-first because Raycast is a macOS app. Linux is hook-only and native Windows is unsupported.
- Codex is intentionally not wired yet because it does not currently expose stable native hooks for this flow.
- Antigravity is intentionally not wired yet because it does not currently expose a stable external shell hook surface for this flow.
- The extension stores managed sound data under `~/.claude-raycast-notifier` by default.
