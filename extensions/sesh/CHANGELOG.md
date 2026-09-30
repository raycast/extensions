# Sesh Changelog

## [Search and connect to windows] - 2026-09-23

- Add a Connect to Window command that lists every tmux window, grouped by session, and jumps straight to the one you pick, even when several windows share a name
- Add a Search Windows action (⌘↵) on tmux sessions that lists just that session's windows, and creates a new window when none has the name you typed

## [Helpful empty states] - 2026-09-22

- Show a dedicated empty state when the sesh CLI isn't installed, with a copyable Homebrew install command and a link to sesh on GitHub
- Show clear empty states when tmux isn't running, when the sesh CLI is too old, or when no sessions exist, instead of a failure toast over a blank list

## [Open instantly from cache] - 2026-09-19

- Open the session list instantly from cache while it refreshes in the background, instead of showing an empty list on every launch
- Add a Refresh Sessions action (⌘R) to reload the list on demand

## [Run CLI commands without a shell] - 2026-09-18

- Pass arguments to `sesh`, `tmux` and `open` directly instead of through a shell, so session names containing quotes, `$` or other special characters connect correctly, and terminal apps with spaces in their name open correctly
- Apply changes to the Environment Path preference immediately, without needing to reload the extension

## [Force LANG / LC_ALL to UTF-8 Locale] - 2026-06-26
- Force LANG and LC_ALL to UTF-8 to allow emoji and other multibyte names to be rendered correctly

## [Make PATH configurable] - 2025-10-09
- Add a user-setting for the PATH variable

## Improve list - 2025-09-25

- Add support for tmuxinator list items
- Flatten the results so the list is in the same results as what sesh responds with (which honors people's configuration of source ordering)

## [Add nix-darwin support] - 2024-12-04

- Add [nix-darwin](https://github.com/LnL7/nix-darwin) support by adding `/run/current-system/sw/bin/` to the PATH

## Add config source - 2024-03-28

- Add config section between tmux and zoxide in list items
- Combine to one sessions state object
- Switch icon getter logic to switch case
- Use session name for connecting instead of path
- Wrap connect command argument in quotes

## Visual improvements - 2024-02-22

- List sessions with `--json` flag for metadata
- Group sessions by tmux and zoxide
- Show icons to differentiate between tmux and zoxide sessions
- Show window count for tmux sessions
- Show score for zoxide results

## [Require tmux running] - 2024-01-31

- Add error message if tmux is not running

## [Initial Version] - 2024-01-23

- Add `Connect to Session` command
