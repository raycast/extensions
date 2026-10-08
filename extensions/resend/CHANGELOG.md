# Resend Changelog

## [Received Email and Expanded AI Tools] - 2026-08-31

- Add a Received Emails command with inbound message details and attachment downloads
- Add expiring share links and scheduled-email cancellation to the Emails list and detail views, with request failure handling
- Move contact workflows from deprecated audiences to segments, fix contact update semantics, and keep account deletion as a separate action
- Add AI tools for received email, temporary share links, email metrics, rescheduling, domains, templates, broadcasts, segments, topics, webhooks, and API logs
- Improve email sending with text and HTML bodies, URL attachments, headers, topics, idempotency keys, and stricter input validation
- Show custom headers in the send-email confirmation
- Move AI instructions and evals to `ai.yaml` and expand coverage across core read, write, and safety workflows
- Update the Resend SDK for current API coverage

## [OAuth Support] - 2026-07-09

- This update brings OAuth support

## [Use Resend SDK + Add Windows Support] - 2025-11-03

- Add Windows Support
- We now use Resend Node SDK

### API Keys

- Deletion is now optimistic

### Contacts

- Deletion is now optimistic
- Automatically reload after Update

### Domain

- Deletion is now optimistic

### Emails

- Resend now lets you fetch sent emails via API so no more need for local logging

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
