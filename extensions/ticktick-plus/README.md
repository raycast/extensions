# TickTick for Raycast

Unofficial community [Raycast](https://raycast.com) extension for [TickTick](https://ticktick.com) on **macOS**. Manage tasks, projects, tags, habits, pomodoro, smart lists, and more — from Raycast.

> **Disclaimer:** This is not affiliated with or endorsed by TickTick / Appest. You must create your own OAuth app at [developer.ticktick.com](https://developer.ticktick.com).

## Features

- **Tasks** — Today, Inbox, Next 7 Days, Overdue, Search, Eisenhower Matrix, Completed, Trash
- **Quick Add** — title, notes, due date, tags, priority, project
- **Task actions** — edit, move, complete (with undo), subtasks, comments
- **Projects & tags** — browse, manage projects and tags
- **Habits** — view and check in
- **Pomodoro** — start/pause/finish synced with TickTick
- **Focus stats** — view focus history
- **Menu bar** — pomodoro timer and overdue/urgent counts
- **Background alerts** — notifications for overdue and urgent tasks

## Requirements

- macOS
- [Raycast](https://raycast.com) installed
- TickTick account
- OAuth app from [developer.ticktick.com/manage](https://developer.ticktick.com/manage)

## Setup (OAuth)

1. Go to [developer.ticktick.com/manage](https://developer.ticktick.com/manage) and create an app.
2. Set the **redirect URI** to:
   ```
   raycast://oauth?package_name=Extension
   ```
3. Copy the **Client ID** and **Client Secret**.
4. Open Raycast → **Extensions** → **TickTick** → **Configure Extension** and paste both values.
5. Run any TickTick command and complete the OAuth login.

## Install from source (local / GitHub)

```bash
git clone https://github.com/ysrazsingh/ticktick.git
cd ticktick
npm install
npm run dev
```

Raycast will load the extension in development mode. Configure OAuth in extension preferences before use.

## Commands

| Command | Description |
|---------|-------------|
| Today | Tasks due today |
| Inbox | Inbox tasks |
| Next 7 Days | Upcoming week |
| Overdue | Past-due tasks |
| Search | Search all tasks |
| Quick Add | Create a task |
| Projects | Browse by project |
| Eisenhower Matrix | Priority quadrants |
| Tags | Browse by tag |
| Filters | Smart lists |
| Templates | Task templates |
| Completed | Completed tasks |
| Trash | Deleted tasks |
| Habits | Habit tracker |
| Pomodoro | Focus timer |
| Focus Stats | Focus statistics |
| Manage Projects | Create/edit projects |
| Manage Tags | Create/edit tags |
| Profile | Account info |
| Menu Bar | Timer & counts in menu bar |
| Background Check | Overdue/urgent alerts (runs in background) |
| Log Out | Clear OAuth session |

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
2. **Screenshots** — add 3–6 images to a `metadata/` folder. In dev mode, press **⌘⇧2** in Raycast to capture store screenshots.
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
