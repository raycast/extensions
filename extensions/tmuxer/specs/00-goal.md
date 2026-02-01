# Goal

## Objectives
- Run 5-10 persistent TUI agent sessions (Claude/Codex/etc.)
- Sessions keep running after disconnects
- Sessions are named and easy to identify
- Fast attach from anywhere
- Local-first behavior with optional remote SSH

## Scope
- tmux is the session manager
- Raycast extension lists sessions and attaches on Enter
- Local and remote use the same commands, with SSH wrapping in remote mode

## Non-goals
- Not specifying the exact agent TUI or its runtime
- Not implementing multi-tenant security beyond SSH keys
