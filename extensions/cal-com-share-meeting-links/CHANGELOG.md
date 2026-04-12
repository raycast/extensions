# Cal.com Share Meeting Links Changelog

## [Fix: Migrate to Cal.com API v2] - {PR_MERGE_DATE}

- Migrate all API calls from Cal.com API v1 to v2 (v1 was permanently shut down on April 8, 2026)
- Update authentication from query parameter to Bearer token header
- Add required `cal-api-version` headers for all endpoints
- Replace booking status update with separate confirm/decline endpoints (removes "Pending" option which is no longer supported)
- Update cancel booking from DELETE to POST with request body
- Use v2 field names (`meetingUrl`, `location`, `lengthInMinutes`, `recurrence`, etc.)

## [Generate private links] - 2025-10-28

- Adds an action inside "Share Meeting Link" to generate and copy a one-time use private link (⌘ + S).

## [Update] - 2025-04-14

- Adds created at date to bookings, to show booking date

## [Update] - 2025-04-01

- Adds action to open availability troubleshooter for meeting links

## [Update] - 2024-07-29

- Display event prices

## [Visual refresh and Improvements] - 2024-07-04

- Visual refresh for "View Bookings" and "Share Meeting Links" commands
- Using optimistic updates during mutation and updated dependencies

## [Update & bug fix] - 2024-06-20

- Adds action to open upcoming bookings in browser
- Bug fix for open booking link

## [Updated] - 2024-06-12

- Adds submenu to View Bookings command to enable you to update a booking's status

## [Update] - 2024-06-04

- Adds View Bookings command, which displays the user's bookings
- View Bookings includes an action to enable you to cancel bookings

## [Update] - 2023-12-04

- Sets the event type's length as a keyword so that you can still search for "60" to find an event type named "1 hour call"

## [Update] - 2023-09-10

- Sorts event types to match their order in the dashboard
- Adds actions to open your dashboard and copy the link to your public page

## [Initial Version] - 2022-09-07

- Supports Cal.com cloud version
- Copy meeting link to clipboard
- Open preview link
