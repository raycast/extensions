# Kill Process

Find the app or background process that's slowing your Mac down and stop it, without opening Activity Monitor.

Kill Process lists everything that's running, sorted by CPU or memory usage, so the heaviest processes are at the top. Pick one and kill it, or force kill it if it won't quit.

## Commands

- **Kill Process**: Lists all running processes by CPU or memory usage. Kill or force kill the selected one.

## Use it with Raycast AI

Mention `@kill-process` in Raycast AI and ask in plain language, for example "what's using the most memory?" or "kill everything called node". It can:

- List running processes with their CPU and memory usage
- Kill a process by name or PID
- Kill all processes with a given name

Force killing from Raycast AI on macOS needs sudo. The easiest way is to enable Touch ID for sudo.

## Preferences

- **Prioritize Apps**: list apps before background processes.
- **Never Ask for Confirmation**: skip the confirmation before killing a process.
