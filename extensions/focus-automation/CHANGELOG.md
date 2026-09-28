# Focus Automation Changelog

## [Reliability fixes] - {PR_MERGE_DATE}

- Fixed: if Google access was revoked or expired, reconnecting could get stuck. Reconnect now always works.
- Fixed: clicking Start on a Focus prompt could, very rarely, end the session the instant it started. Added a short delay to prevent it.
- Small hardening around expired logins and status messages.
- Added: a Send Feedback action on the status screen.

## [Initial Version] - 2026-08-04

- Connect a Google Calendar and automatically start a Raycast Focus session when a calendar block begins.
- Choose confirm-first or fully automatic start.
- Each session blocks distracting app and website categories.
- First-run setup: connect, pick a calendar, and preview your next trigger.
