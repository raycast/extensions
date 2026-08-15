# Flow Changelog

## [Start Timer with a title] - 2026-08-11
- `Start Timer` now accepts an optional title argument, so a session can be titled and started in one command.
- Add a `Default Session Title` preference used when starting without typing a title (handy for a recurring project).
- Add a `Start Previous Session` command to reload and start the last session, useful for repetitive sessions.
- Escape backslashes as well as quotes when setting a session title.

## [Set Session Title command] - 2025-02-27
- Implement `Set Session Title` command to allow setting a custom session title.  
- Add a form for users to input and update the session title.  

## [Fix broken start commands] - 2023-09-03

## [Start Commands & Keywords] - 2022-03-16
- Improve command search by adding keywords like `pause` for command like `Stop Timer`
- Replace `Next Session` command for `Start Next Focus`
- Add `Start Next Break` command

## [Categories] - 2022-03-12
Add categories for the store

## [Timer Improvements] - 2022-02-14
- Add `Next Session` command (shortcut for `Skip Session` + `Start Session`)
- Make `Reset Timer` command start a new timer instead of pausing the current one

## [Added Flow] - 2021-12-06
Initial version code
