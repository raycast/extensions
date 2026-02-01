# Tmux Session Patterns

## Session model
- One tmux session per agent or repo
- Session name identifies the workspace
- Session starts in repo directory
- Agent runs inside the session and keeps running

## Commands
Create sessions in repo dirs:
```bash
tmux new-session -d -s codex -c ~/repos/codex
tmux new-session -d -s claude -c ~/repos/claude
```

Attach:
```bash
tmux attach -t codex
```

Create or attach (preferred for automation):
```bash
tmux new -A -s codex
```

List sessions (simple):
```bash
tmux list-sessions -F '#S'
```

List sessions (rich):
```bash
tmux list-sessions -F '#S|windows=#{session_windows}|created=#{session_created_string}|attached=#{session_attached}'
```

## Notes
- For Raycast, the simple list output is easiest to parse.
