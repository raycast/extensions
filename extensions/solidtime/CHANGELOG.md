# Solidtime Changelog

## [Change solidtime URL + Handle Errors] - 2025-09-02

- fix: **MembershipAccessory** would always be `isLoading`
- add: `EmptyView` when no clients
- add: `EmptyView` when no projects
- `showFailureToast` `onError`
- define your own URL for solidtime in `Preferences` (ref: [Issue #20525](https://github.com/raycast/extensions/issues/20525))

## [Initial Version] - 2025-03-02

- Initial release
- Supported features:
  - Organizations
    - Switch between your organizations
  - Clients
    - Show details
    - Create
    - Edit 
    - Delete
    - Archive
  - Projects
    - Show details
    - Create
    - Edit
    - Delete
    - Archive
    - Start entry from project
  - Time Entries
    - List recent and active time entry
    - Start from past one
    - Start a new time entry
    - Stop
