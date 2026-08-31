# App Sessions

Start and end named sessions of Mac apps from Raycast. A session can also run Apple Shortcuts and ordered lists of Raycast commands after its apps start or end.

## Features

- **App Sessions** — Create named sessions like "Work", "Design", or "Gaming" with any combination of installed apps
- **Start Session** — Open every app in a session with one command
- **End Session** — Ask every app in a session to quit normally, without force-killing it
- **Apple Shortcuts Integration** — Optionally run a Shortcut after starting or ending a session
- **After Start/End Commands** — Run Raycast commands in order, with an optional wait before each command
- **Configurable Start Delay** — Add a delay between opening apps if needed

## Commands

| Command | Description |
|---------|-------------|
| **Start Session** | Pick a session and open all its apps |
| **End Session** | Pick a session and gracefully quit all its apps |
| **Manage Sessions** | Create, edit, and delete sessions |

## Getting Started

1. Open Raycast and run **Manage Sessions**
2. Create a new session with `Cmd+N` — give it a name and icon
3. Select **Edit Session** to choose apps, Shortcuts, and commands in one form
4. Run **Start Session** to open its apps and run its automation

## Preferences

| Preference | Description |
|------------|-------------|
| **Start Delay** | Delay between opening each app (None, 500ms, or 1 second) |

## Apple Shortcuts

Each session can optionally run an Apple Shortcut after its apps start or end. Choose installed Shortcuts in the session form; if Shortcuts cannot be listed, enter the exact name manually.

- **Start Shortcut** — Runs after opening apps (e.g., "Start My Focus")
- **End Shortcut** — Runs after asking apps to quit (e.g., "End My Focus")

The shortcut name must match exactly as it appears in the Shortcuts app.

## Raycast Commands

In **Edit Session**, paste start and end commands in the order they should run. Find a command in Raycast, press `Cmd+Shift+C` to copy its deeplink, and paste it into the next empty command field. The wait applies before that command, after the corresponding Shortcut or preceding command.

Raycast confirms when a command launches, not when it finishes. Multi-command sessions work best with commands that do not open an interactive view.
