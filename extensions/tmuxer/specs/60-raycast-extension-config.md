# Raycast Extension Config

## Preferences
- mode: local | ssh
- sshHost: string (required in ssh mode)
- listCommandTemplate: default `tmux list-sessions -F '#S' 2>/dev/null || true`
- attachCommandTemplate: default `tmux new -A -s "{{session}}"`

## Command assembly
- Local mode:
  - listCmd = listCommandTemplate
  - attachCmd = attachCommandTemplate
- SSH mode:
  - listCmd = `ssh {{sshHost}} "{{listCmd}}"`
  - attachCmd = `ssh {{sshHost}} -t "{{attachCmd}}"`

## Notes
- Keep templates user-editable in Raycast preferences.
- Use {{session}} placeholder for selected session.
