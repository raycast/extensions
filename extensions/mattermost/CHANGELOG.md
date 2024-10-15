# Mattermost Changelog

## [Enhancements] - {PR_MERGE_DATE}

- Fix: `Search Channel` not loading when ZERO channels (and related)
- `signIn` function is now `async`
- Show better error message when Authorization fails
- `usePromise` in `withAuthorization` component for better control
- In `search-channels` you can specify in Preferences whether to launch installed Mattermost application or not
- Fix: various typos
- Add an `Axios` intercept for robust error handling
- Update dependencies

## [Fix] - 2023-10-03

- Add re-login when sign-in token expired

## [Initial Version] - 2023-08-27

- Add `Search Channel` command
- Add `Set Presence Status` command
- Add `Set Custom Status` command
