# Recommended Workflow

## Repo layout
```bash
~/repos/
  codex/
  claude/
  coded-chatgpt/
```

## Session creation
```bash
tmux new-session -d -s codex -c ~/repos/codex
tmux new-session -d -s claude -c ~/repos/claude
```

## Usage
- Start the agent inside each session.
- Detach or disconnect; session continues running.
- Reattach via Raycast or direct tmux/ssh command.
