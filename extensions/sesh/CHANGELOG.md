# Sesh Changelog

## [Add nix-darwin support] - 2024-12-04

- Add [nix-darwin](https://github.com/LnL7/nix-darwin) support by adding `/run/current-system/sw/bin/` to the PATH

## Add config source - 03-28-24

- Add config section between tmux and zoxide in list items
- Combine to one sessions state object
- Switch icon getter logic to switch case
- Use session name for connecting instead of path
- Wrap connect command argument in quotes

## Visual improvements - 02-22-24

- List sessions with `--json` flag for metadata
- Group sessions by tmux and zoxide
- Show icons to differentiate between tmux and zoxide sessions
- Show window count for tmux sessions
- Show score for zoxide results

## [Require tmux running] - 01-31-24

- Add error message if tmux is not running

## [Initial Version] - 10-01-2024

- Add `Connect to Session` command
