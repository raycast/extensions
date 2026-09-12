# App Store Connect Changelog

## [Individual API Keys, Fixes and Modernization] - 2026-09-01

- Add support for Apple's individual API keys, which have no Issuer ID
- Fix removing a team member or revoking an invitation clearing the entire list
- Fix adding a rejected key deleting the previously working one instead
- Fix removing one credential also removing another that shares its Key ID
- Fix a transient network error, a permission error, or an unreadable key file during sign-in deleting stored credentials
- Fix removals leaving a row missing from the list when the request failed
- Fix adding and removing builds from a beta group failing from the Manage Builds screen
- Fix testers being added with a missing invite type and state
- Fix mutations silently doing nothing, and reporting success, when credentials are missing
- Fix lists appending duplicate rows when paginating, and showing stale rows while switching apps
- Fix one team's data being shown after switching to another team, by scoping the cache to the selected key
- Fix an unreadable key file leaving the sign-in form loading with no error shown
- Fix the "showing first N" notice never appearing when a list stopped at the page limit
- Stop offering to remove the Account Holder, which App Store Connect always refuses
- Rename "Delete Team" to "Remove from Raycast" and say what it does and does not affect
- Make removal no longer the default action in Manage Teams
- Show whether each stored credential is a team or individual key, and stop printing its Key ID twice
- Add "Remove All Keys" to clear every stored credential at once
- Add "Rename Key" so a stored credential can be given a meaningful label after it is added
- Group stored credentials into Individual Keys and Team Keys sections
- Show an unnamed credential by its Key ID rather than a generated name
- Add actions to open App Store Connect's API Keys and Users and Access pages from the key form
- Rename "Manage Teams" to "Manage API Keys", now that a credential can be an individual key
- Return to the key list after adding a key, instead of leaving the form on screen
- Add a loading and an empty state to Manage Teams
- Name what is being removed in confirmation dialogs, rather than asking "Are you sure?"
- Resolve app icons in one request per list instead of one per app
- Failure toasts now offer a Copy Error action
- Replace emoji in status labels with themed Raycast icons, and give statuses that shared an icon their own
- Rewrite App Store Connect errors into plain language, and stop repeating the same sentence twice in a toast
- Show why a build can't be added to a group before submitting, instead of after Apple rejects it
- Add an empty state to Builds explaining what to do when there are none
- Group actions into sections throughout, headed by the item they act on
- Dim tester session, crash, and feedback counts when they are zero, so colour marks something real
- Name what happened in success toasts, rather than "Success!"
- Update to Raycast API 2.0 and Node 22, and drop the unused `node-app-store-connect-api` dependency

## [Add View App Status Command] - 2026-04-30

- Add `View App Status` command to display app statuses and release versions pending developer release
- Filter apps by platform (iOS, macOS, tvOS, visionOS) and by App Store state
- Release individual or all pending apps in `PENDING_DEVELOPER_RELEASE` state

## [Fix] - 2024-10-29

- Add searchBarAccessory in SignIn

## [Initial Version] - 2024-10-28
