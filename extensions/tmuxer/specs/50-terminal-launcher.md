# Terminal Launcher Helper

## Purpose
Open a local terminal and run an attach command.

## Inputs
- command: string to execute (local or ssh attach command)

## Behavior
- Launch the terminal app if needed.
- Create a new window or tab.
- Run command in that session.

## iTerm2 example (AppleScript)
```bash
osascript <<'APPLESCRIPT'
tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    write text "tmux new -A -s codex"
  end tell
end tell
APPLESCRIPT
```

## Notes
- One terminal app is enough; iTerm2 is the default target.
- Keep this helper as a single function or script.
