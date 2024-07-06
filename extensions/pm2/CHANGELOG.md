# Raycast PM2

## [Enhancement] - {PR_MERGE_DATE}

- Bump dependencies
- Drop `pm2-wrapper`
- Drop pre-requirements for Node.js, npm, and pm2 on user's local
- Drop `RuntimeOptions` support, please pass-in your runtime context through `pm2.start()` options instead

## [Bugfixes & Chore] - 2024-06-05

- Fix API command
- Add [`raycast-pm2`](https://github.com/LitoMore/raycast-pm2) example to readme
- Bump dependencies

## [Enhancement] - 2024-05-28

- Handle installation errors
- Hanlde PM2 command errors
- Make errored processes stoppable

## [Initial Version] - 2024-05-25

- View PM2 process list
- Manage PM2 processes (start, stop, restart, reload, delete)
- Run any Raycast Node.js application in PM2 through [Cross-Extension](https://github.com/LitoMore/raycast-cross-extension-conventions)
