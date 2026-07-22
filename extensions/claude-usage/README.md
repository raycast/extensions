# Claude Usage

Keep an eye on your Claude Code limits from the macOS menu bar.

The menu bar shows how much of your current 5-hour session you've used and how long until it resets. Opening it breaks the numbers down further:

- **Current session** — the rolling 5-hour window, with a countdown to reset
- **Current week** — your weekly allowance across all models
- **Usage credits** — pay-as-you-go spend against your cap, when you have credits enabled

Each row carries a progress icon: a grey disc that fills clockwise with orange, turning red past 95%. Clicking a row copies its numbers to the clipboard.

## Requirements

You need [Claude Code](https://claude.com/claude-code) installed and signed in. The extension reads your existing OAuth token from the macOS Keychain (the `Claude Code-credentials` item) and never asks for credentials of its own. Nothing is sent anywhere except Anthropic's own usage endpoint.

## Preferences

**Refresh Frequency** — how often to fetch fresh numbers, from every minute to every 30 minutes (default: 5 minutes).

Raycast wakes the command on a fixed one-minute interval, so this setting works by reusing the last response from a local cache until it goes stale. Your chosen frequency is a floor rather than an exact schedule: at "Every 5 minutes" a refresh lands somewhere in the 5–6 minute window. `Refresh Now` (⌘R) always bypasses the cache.

## Notes

The usage endpoint is rate limited, and the limit is shared with Claude Code itself. When a request is throttled the extension replays the last known response rather than going blank, mirroring what Claude Code does. Longer refresh intervals make this less likely.

Usage above 95% triggers a one-time system notification per percentage point.
