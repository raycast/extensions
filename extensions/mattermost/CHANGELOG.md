# Mattermost Changelog

## [Fix DMs Not Shown] - 2025-07-30

- Fix: Direct Messages would not show in `Search Channels` (ref: [Issue #19587](https://github.com/raycast/extensions/issues/19587))
- Modernize to use latest Raycast config

## [Enhancements] - 2024-10-22

- Fix: `Search Channel` not loading when ZERO channels (and related)
- `signIn` function is now `async`
- Show better error message when Authorization fails (should close [#14876](https://github.com/raycast/extensions/issues/14876))
- `usePromise` in `withAuthorization` component for better control
- You can now specify in Preferences whether to open deep links in Browser or Mattermost Application
- Fix: various typos
- Add an `Axios` intercept for robust error handling
- Update dependencies

## [Fix] - 2023-10-03

- Add re-login when sign-in token expired

## [Initial Version] - 2023-08-27

- Add `Search Channel` command
- Add `Set Presence Status` command
- Add `Set Custom Status` command
