# Cal.com Share Meeting Links Changelog

## [Fix + improve View Bookings] - 2026-04-14

- Fix a bug where View Bookings only showed the first 100 bookings (hiding all recent + upcoming bookings for users with longer histories)
- Group bookings into Pending Confirmation, Upcoming, Past, and Cancelled sections
- Pending Confirmation appears at the top so bookings awaiting your response don't get missed
- Past bookings now lazy-load on scroll (50 per page)
- Cancelled bookings hidden by default; toggle with ⌘ H

## [Add: Manage Out of Office] - 2026-04-14

- Adds a new "Out of Office" command
- Lists current and upcoming OOO entries with reason-tinted icons and date ranges
- Create, edit, and delete OOO entries (date range, reason, optional notes)
- Set a redirect target by picking a teammate from a searchable dropdown (with avatars)
- Quick links to the Out of Office and General Account settings on cal.com (covers scheduled timezone change, which has no public API)

## [Add: View and manage availability schedules] - 2026-04-14

- Adds a new "View Availability" command
- List all schedules; each shows working hours, timezone, and default status
- Edit working hours per day (up to 3 time ranges)
- Add, edit, and delete date overrides (including full-day "Unavailable")
- Change a schedule's timezone or name
- Set any schedule as the default

## [Fix: Migrate to Cal.com API v2] - 2026-04-14

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
