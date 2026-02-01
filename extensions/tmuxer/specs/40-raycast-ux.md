# Raycast UX and Command Logic

## Behavior
- Show a list of tmux sessions.
- Pressing Enter opens a terminal and attaches to the selected session.
- Supports local and SSH modes.

## Core commands

Local list:
```bash
tmux list-sessions -F '#S' 2>/dev/null || true
```

Local attach:
```bash
tmux new -A -s "<SESSION>"
```

Remote list:
```bash
ssh <HOST> "tmux list-sessions -F '#S' 2>/dev/null || true"
```

Remote attach:
```bash
ssh <HOST> -t "tmux new -A -s '<SESSION>'"
```

## Requirements
- Session names are returned one per line.
- Enter triggers attach for selected session.
- Attach should create the session if missing.
