# TrackTimer for Raycast

[TrackTimer](https://www.tracktimer.app) helps freelancers, consultants, and agencies track client work. Start and stop timers, find recent work, and switch between projects without leaving Raycast.

## Features

- **See what's running.** Check your current timer and stop it when you're done.
- **Pick up recent work.** Search by description, project, or client, then start a new timer with the same project and billable setting.
- **Start something new.** Choose a client and project, add a description, and mark the time as billable or non-billable.

Your timers stay in sync with TrackTimer on the web, Mac, and iPhone. Starting a timer finishes the one already running for your account, including in another workspace. Restarting recent work creates a new time entry and leaves the original record intact.

## Get started

You need macOS and a TrackTimer account.

1. Sign in to [TrackTimer](https://www.tracktimer.app/app) and select the workspace you want to track time in.
2. Open your account menu, choose **API keys**, select **Create key**, and copy the key.
3. Paste the key into **TrackTimer API Token** in the extension preferences.
4. Open **Start/Stop Timer** to pick up recent work, or **Start New Timer** to choose a project and description.

The key is stored in Raycast's password preference. The extension needs `clients:read`, `projects:read`, `timers:read`, and `timers:write`; keys created in TrackTimer include these permissions. Each key stays connected to the workspace selected when it was created.

## Using the extension

**Start/Stop Timer** shows your running timer and recent work. Type part of a description, project name, or client name to filter the loaded recent timers, then press Return to start the selected timer again. Clear the search to see the full list.

**Start New Timer** lets you select an existing client and assigned project, write a description, and choose whether the time is billable. Use **Manage Projects in TrackTimer** to manage projects, then reload the choices in Raycast.

Recent timers refresh every minute while the command is open. Use **Refresh** to load the latest changes immediately. If an action needs another attempt, choose **Retry pending timer action** to finish it.

Learn more about [time tracking for client work with TrackTimer](https://www.tracktimer.app), or read the [API documentation](https://www.tracktimer.app/docs).

## Development and attribution

See the [development and packaging notes](https://github.com/raycast/extensions/blob/main/extensions/tracktimer/DEVELOPMENT.md) for local setup, caching, checks, and Store submission.

The recent-timer list and quick-start flow are adapted from the [Toggl Track extension](https://www.raycast.com/franzwilhelm/toggl-track), by Franz Wilhelm and contributors, at [commit `fa8b3874b6f49776570e4291d8ed74b532164013`](https://github.com/raycast/extensions/tree/fa8b3874b6f49776570e4291d8ed74b532164013/extensions/toggl-track). TrackTimer replaces its Toggl-specific service integration and branding. The upstream repository's MIT license and copyright notice are preserved in `LICENSE`.

The icon reuses TrackTimer's 3D sundial app artwork: an orange fin above a brushed-metal dial and stone base. It is the 512 × 512 PNG from the macOS app icon and contains no Toggl artwork.
