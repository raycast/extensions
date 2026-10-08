# Proton Mail Changelog

## [Bridge Connection Errors] - {PR_MERGE_DATE}

- When Proton Mail Bridge can't be reached (not running, or a different host or port than the preferences), say so with the configured address and actions to open Bridge, try again or open the preferences, instead of an empty folder and a connection error
- When Bridge rejects the username or password, explain which password to use, with an action to open the extension preferences
- These screens check Bridge again every few seconds and load the emails once it's ready, so starting Bridge is enough, even with the extension left open in the background. While Bridge is still loading the account after starting, the screen says so instead of reporting rejected credentials

## [Fix Delete and Open in Proton Mail] - 2026-10-05

- "Delete" now moves emails to Trash ("Move to Trash"). In Trash and Drafts it becomes "Delete Permanently", with a confirmation
- "Open in Proton Mail" opens the email itself instead of a subject search

## [Updated Icon] - 2026-10-05

- Update the extension icon to the current official Proton Mail logo

## [Initial Version] - 2026-01-23