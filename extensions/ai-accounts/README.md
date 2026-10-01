# AI Accounts

AI Accounts shows remaining quota for your Claude Code and Codex accounts in
Raycast. See each account's five-hour and weekly limits, reset times, and active
login. Switch Claude Code accounts with one key, get suggestions when quota runs
low, and keep active-account quota in the menu bar.

The extension uses claude-swap for Claude Code and CodexBar for Codex. Lifetime
usage statistics come from local Claude Code and Codex logs.

## Setup

You need Raycast on macOS and the backend for each provider you use.

### Claude Code

Install claude-swap, then register each Claude Code account:

```sh
uv tool install claude-swap
cswap add
```

Run `cswap add` while Claude Code is signed in to the account you want to save.
For another account, use `/login` in Claude Code, sign in, and run `cswap add`
again. Never run `/logout` before adding an account; it can invalidate the saved
credentials.

You can also use **Add Claude Account…** in AI Accounts. The extension opens
iTerm when it is installed in `/Applications/iTerm.app` or
`~/Applications/iTerm.app`, and uses Terminal otherwise. Automatic tracking of
new Claude Code logins is enabled by default in the extension preferences.

### Codex

Install CodexBar and add your Codex accounts through CodexBar:

```sh
brew install --cask steipete/tap/codexbar
```

Open CodexBar and finish account setup before opening AI Accounts. If a backend
executable is installed elsewhere, set its path in the extension preferences.

## Accounts and switching

Open **AI Accounts** to see accounts, remaining quota, and reset times. Select a
Claude Code account and press Return to switch through claude-swap. Suggestions
use the lowest remaining quota window and default to a 20% threshold. You can
change that threshold, include model-specific limits, exclude accounts from
suggestions, or enable advice for weekly quota that resets soon.

Codex switching defaults to opening CodexBar. Finish the switch in
**Codex → System Account**. This mode doesn't change the Codex login itself.

Direct Codex switching is an experimental opt-in preference. It replaces
`~/.codex/auth.json` using CodexBar's saved accounts, as the System Account menu
does. It stops and restarts the Codex app-server daemon when it is running, and
can interrupt running Codex turns. Finish your current turns before using it.
If an account can't be switched directly, finish the switch in CodexBar.

### After-switch command

Set the optional **After-switch Command** preference to run a local command
after a switch returns `succeeded`, `noop`, or `unknown`. It runs through
`/bin/sh -c` in a detached background process. For example, you can refresh a
status bar after changing accounts.

The command receives these environment variables:

- `AI_ACCOUNTS_PROVIDER`: `claude` or `codex`.
- `AI_ACCOUNTS_ACCOUNT`: the target account label.
- `AI_ACCOUNTS_RESULT`: `succeeded`, `noop`, or `unknown`.

An `unknown` result means the switch couldn't be confirmed. No command runs for
a CodexBar hand-off, a failed switch, or a blocked switch.

## Menu bar and statistics

Enable **AI Accounts Menu Bar** to see active-account quota and switch from its
menu. Choose five-hour and weekly values, the lowest remaining quota window, or
weekly quota alone. Percentages show remaining quota by default; preferences
can change them to quota used.

Open **AI Usage Statistics** for lifetime tokens, input and output counts, cache
usage, and model totals from available local logs, plus a list-price estimate
for Claude Code. Codex
statistics can be grouped by account when session logs record the account ID.
Claude Code logs don't record account identity, so its statistics combine all
accounts. Lifetime totals cover the logs available on your Mac; missing or
deleted logs reduce that coverage. List-price estimates aren't subscription
charges.

## Privacy and limitations

AI Accounts processes data locally. It reads usage through claude-swap and
CodexBar, identity claims from local login files, and usage counts from local
logs. It caches account labels, quota readings, switch results, and statistics.
The extension doesn't transmit or cache authentication tokens. The provider
tools manage credentials and may contact their services to refresh usage or
logins; experimental direct switching writes the local Codex authentication
file.

Claude Code switching doesn't change the Claude desktop app's separate login.
Quota readings can be delayed or unavailable, and the extension shows backend
errors and previously cached readings when available.
