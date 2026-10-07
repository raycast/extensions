# Proton Mail Changelog

## [Faster Actions] - {PR_MERGE_DATE}

- Keep the connections to Bridge open for the whole command instead of reconnecting for every action: one for loading lists, one for opening emails and actions, so clicks never wait for the list
- When Bridge drops a connection (for example while it starts up), the action is retried once on a fresh connection instead of failing

## [Fix Delete and Open in Proton Mail] - 2026-10-05

- "Delete" now moves emails to Trash ("Move to Trash"). In Trash and Drafts it becomes "Delete Permanently", with a confirmation
- "Open in Proton Mail" opens the email itself instead of a subject search

## [Updated Icon] - 2026-10-05

- Update the extension icon to the current official Proton Mail logo

## [Initial Version] - 2026-01-23
