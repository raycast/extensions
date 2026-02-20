# One Shot Apps

Create named app groups and launch or quit them all at once. Perfect for switching between work contexts — open your entire "Work" setup with a single command, then quit everything when you're done.

## Features

- **App Groups** — Create named groups like "Work", "Design", or "Gaming" with any combination of your installed apps
- **One-Command Launch** — Open every app in a group with a single Raycast command
- **Graceful Quit** — Quit all apps in a group at once (no force-kill, apps save their state)
- **Apple Shortcuts Integration** — Optionally trigger an Apple Shortcut when launching or quitting a group (e.g., enable Focus mode, set wallpaper)
- **Configurable Launch Delay** — Add a delay between app launches if needed

## Commands

| Command | Description |
|---------|-------------|
| **Launch** | Pick a group and open all its apps |
| **Quit** | Pick a group and quit all its apps |
| **Manage** | Create, edit, and delete your app groups |

## Getting Started

1. Open Raycast and run **Manage**
2. Create a new group with `Cmd+N` — give it a name and icon
3. Select **Edit Apps** to add apps from a searchable list of everything installed on your Mac
4. Run **Launch** to open all apps in the group

## Preferences

| Preference | Description |
|------------|-------------|
| **Launch Delay** | Delay between launching each app (None, 500ms, or 1 second) |

## Apple Shortcuts

Each group can optionally run an Apple Shortcut when launched or quit. Set these in the group edit form:

- **Start Shortcut** — Runs after launching apps (e.g., "Start My Focus")
- **Quit Shortcut** — Runs after quitting apps (e.g., "End My Focus")

The shortcut name must match exactly as it appears in the Shortcuts app.
