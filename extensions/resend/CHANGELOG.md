# Resend Changelog

## [Update Icons] - 2025-07-04

- Update Icons to reflect Resend's new Brand ([Brand Kit](https://resend.com/brand))
- Modernize extension to use latest Raycast config
- chore: remove `node-fetch`, `cross-fetch`

## [Added Region] - 2025-03-10

Added support for Tokyo region

## [Add AI Tools] - 2025-03-05

This release turns this extension into an [AI Extension](https://youtu.be/sHIlFKKaq0A).

Supported tools:

- Send, schedule, list, and cancel emails
- Create, update, list, and delete contacts
- Create, update, list, and delete audiences
- Create, update, list, and delete API keys

New preferences:

- `Sender Name`: Your default name for sending emails
- `Sender Email`: Your default email address for sending emails

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
