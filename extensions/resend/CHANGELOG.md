# Resend Changelog

## [Add AI Tools] - 2025-02-28

This release turns this extension into an [AI Extension](https://youtu.be/sHIlFKKaq0A).

Supported tools:

- Send, schedule, list, and cancel emails
- Create, update, list, and delete contacts
- Create, update, list, and delete audiences
- Create, update, list, and delete API keys

## [User Experience Improvements] - 2024-10-20

- Added new required preferences for default sender:
  - `Sender Name`: Your default name for sending emails
  - `Sender Email`: Your default email address for sending emails
- The `send-email` tool now automatically uses these preferences to format the sender as "Name <email@example.com>"
- Made the `from` field optional in the `send-email` tool as it will always use the preferences if not specified

## [Maintenance Release] - 2024-10-10

- Dark AND Light mode logo
- A new `useResend` hook has been added in an attempt to make code cleaner
- Update dependencies
- In `Domains`:
  - after "Adding" the list is automatically refreshed
  - the "Add New Domain" action has a Keyboard Shortcut
  - the "Delete Domain" action has a Keyboard Shortcut

## [Feature] - 2024-01-28

Added Contacts command which lets you fetch an non-paginated list of contacts from your different audiences and create, update and delete contacts.

## [Initial Version] - 2023-06-27
