# TickTick+ for Raycast

Unofficial community [Raycast](https://raycast.com) extension for [TickTick](https://ticktick.com) on **macOS**. Manage tasks, projects, tags, habits, pomodoro, smart lists, and more — from Raycast.

> **Disclaimer:** This extension is not affiliated with or endorsed by TickTick or Appest. Sign-in uses TickTick OAuth through Raycast—just select **Sign in with TickTick** the first time you run a command. No API credentials are required.

## Features

- **Tasks** — Today, Inbox, Next 7 Days, Overdue, Search, Eisenhower Matrix, Completed
- **Quick Add** — title, notes, due date, tags, priority, project
- **Task actions** — edit, move, complete (with undo), subtasks, comments
- **Projects & tags** — manage projects; browse tasks by tag
- **Habits** — view and check in
- **Pomodoro** — start/pause/finish synced with TickTick
- **Menu bar** — pomodoro timer and overdue/urgent counts
- **Background alerts** — notifications for overdue and urgent tasks

## Requirements

- macOS
- [Raycast](https://raycast.com) installed
- TickTick account

## Setup

1. Run any TickTick command.
2. Click **Sign in with TickTick** in the Raycast overlay and authorize in your browser.
3. That's it—Raycast handles the OAuth session, so no client ID, client secret, or developer app is needed.

## Install from source (local / GitHub)

```bash
git clone https://github.com/raycast/extensions.git
cd extensions/extensions/ticktick-plus
npm install
npm run dev
```

Raycast will load the extension in development mode. Run a command and sign in with TickTick to get started.

## Commands

| Command                     | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| Today                       | Tasks due today                                       |
| Inbox                       | Inbox tasks                                           |
| Next 7 Days                 | Upcoming week                                         |
| Overdue                     | Past-due tasks                                        |
| Search Tasks                | Search all tasks                                      |
| Create Task                 | Create a task                                         |
| Projects                    | Browse by project                                     |
| Eisenhower Matrix           | Priority quadrants                                    |
| Tags                        | Browse by tag                                         |
| Smart Lists                 | Saved TickTick filters                                |
| Completed                   | Completed tasks                                       |
| Habits                      | Habit tracker                                         |
| Pomodoro                    | Focus timer                                           |
| Manage Projects             | Create/edit projects                                  |
| Profile                     | Account info                                          |
| Menu Bar                    | Timer & counts in menu bar                            |
| Background Alerts           | Overdue and high-priority alerts (runs in background) |
| Disconnect TickTick Account | Clear the OAuth session                               |

**Tip:** Complete a task with **⌘⇧↩** from any task list.

## Development

```bash
npm install
npm run dev      # load in Raycast
npm run build    # production build
npm run lint     # ESLint
```

## Publish to Raycast Store

Raycast extensions are open source and live in the [raycast/extensions](https://github.com/raycast/extensions) monorepo after review.

### Before you publish

1. **Build & lint** — both must pass:
   ```bash
   npm run build && npm run lint
   ```
2. **Screenshots** — add 3–6 PNG images at 2000 × 1250 pixels to a `metadata/` folder. In Raycast v2, assign a hotkey to **Capture Window**, enable **Save to Metadata**, and use one consistent background.
3. **Naming** — an [official TickTick extension](https://www.raycast.com/appest/ticktick) already exists in the store under the slug `ticktick`. This extension uses **`ticktick-plus`** / **TickTick+** so it publishes as a separate extension (do not use slug `ticktick` or `pull-contributions` will merge the official extension and cause conflicts).

### Submit

```bash
npm run publish
```

This opens a pull request to `raycast/extensions` on GitHub. After Raycast team review and merge, the extension appears in the [Raycast Store](https://www.raycast.com/store) for everyone to install.

You need a [Raycast account](https://raycast.com) linked to GitHub with access to publish extensions.

## Open source

This repo is **public** on GitHub:

**https://github.com/ysrazsingh/ticktick**

License: [MIT](LICENSE)

Anyone can clone, use, fork, and contribute. If you publish to the Raycast Store, the code also lives in `raycast/extensions` under the same open-source model.

## Contributing

Issues and pull requests are welcome on GitHub.

## Author

- **GitHub & Raycast:** [ysrazsingh](https://github.com/ysrazsingh) · [Raycast profile](https://www.raycast.com/ysrazsingh)
