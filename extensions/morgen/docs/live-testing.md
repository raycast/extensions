# Live validation — 2026-09-30

Repeat this workflow using the [paced synthetic test guide](synthetic-test.md).

Tested the development extension in Raycast on macOS using a single user-approved personal calendar. Calendar Scope excluded other calendars from event reads and writes. No attendees were invited. Private addresses, credentials, and calendar/event IDs are omitted from this record.

## Successful checks

- Created “Raycast test — Focus session” through Create Event at 21:00 for one hour in America/Argentina/Cordoba. Raycast displayed “Event created!”; a fresh Today command returned the event.
- Search Events found the focus event by title.
- Raycast AI invoked List Calendars and Find Events and reported the stored start, timezone, duration, and presence of an event ID.
- Raycast AI created “Raycast test — Reading break” at 22:15 for 15 minutes, then used Find Events to read it back. A subsequent Today command displayed both events.
- Scoped Calendar Display Name showed “Personal” while retaining the original calendar identity.
- Captured and visually inspected `metadata/morgen-1.png`, a native Raycast 2000×1250 screenshot with synthetic event titles and a clean background.

## Failure found during screenshot preparation

Later fresh reads returned no UI results. A read-only AI diagnostic reported a fetch failure and Morgen HTTP 429 (rate limit exceeded). The user confirmed the test events had not been removed. These failed reads do not prove the calendar is empty.

The UI had discarded the error flag from its fetch helper and displayed a successful empty state. Both event lists now show “Unable to Load Events” and say availability is unknown on failure. The creation form also retains a visible calendar-loading failure message. Regression tests distinguish failed reads from genuinely empty calendars. No automatic API retry or creation retry was added.

## Remaining checks

- Resume live reads after the rate limit clears and capture Search Events and Create Event screenshots. Only one Store screenshot is complete.
- Verify the new failure UI in Raycast; automated component checks pass.
- Test the manual AI confirmation dialog. The live creation used Raycast Auto tool permissions, so no manual dialog was shown. The confirmation function itself is covered by unit tests.
- Test events in timezones different from the machine timezone and DST boundaries. Current live evidence covers the local timezone only.
- The two test events were not deleted by this workflow.

Local validation after the failure-state fix: 7 tests, TypeScript, Raycast lint, and build passed. Store submission has not been performed.

## Slow retest — 2026-10-01

Repeated live checks with at least 45 seconds between command/tool operations (each read operation may internally fetch calendars and then events). No rate-limit errors appeared during this run.

- Create Event loaded the scoped Personal calendar successfully.
- Submitted one new “Raycast test — Focus session” for 2026-10-01 at 21:00, one hour, on that calendar.
- Search Events and List Today's Events independently returned the newly stored event with the expected start and duration.
- A separate AI List Calendars check returned one calendar, Personal, and the current local date/timezone.
- A single AI Find Events call returned the test title, stored start `2026-10-01T21:00:00`, timezone `America/Argentina/Cordoba`, duration `PT1H`, and an event ID. No AI writes or retries were requested in this retest.
- The new test event remains in the personal calendar. No work calendar was used.

This verifies recovery from the prior rate limit; it does not establish the service's rate-limit threshold. Manual AI confirmation, cross-timezone/DST behavior, and the two remaining saved Store screenshots are still outstanding.

## Manual AI confirmation — user verification

The maintainer reported that manual AI creation confirmation was verified. This is user-reported verification; the automated live runs above used Auto permissions and did not independently observe that dialog. Screenshot completion and cross-timezone/DST checks remain separate outstanding items.

## Store screenshots completed — 2026-10-01

Saved and visually inspected the native Raycast Search Events capture (`metadata/morgen-2.png`) and populated Create Event form (`metadata/morgen-3.png`). Both files are 2000×1250 PNGs, use the same clean background as the Today capture, and show only synthetic event content with the Personal display label. The screenshot draft was not submitted. All three Store screenshots are now saved; cross-timezone/DST validation remains outstanding.

## Focused automated timezone validation

Reproduced a display bug: a 10:00 Europe/London event on 2026-10-01 displayed as 10:00 on a Cordoba machine, instead of 06:00. Morgen's [event schema](https://docs.morgen.so/events) supplies a local start and separate IANA timezone.

The UI now resolves that pair through the Temporal polyfill before local display, sorting, and end-based duration calculation. Explicit offsets remain authoritative; missing/null zones use the machine timezone. All-day labels remain unchanged. Temporal compatible disambiguation chooses the first occurrence of overlapping wall times and moves nonexistent wall times forward across the gap; without an offset the provider's intended second overlap occurrence cannot be recovered.

All 10 tests passed under the machine timezone, UTC, and America/New_York. Cases cover London, New York winter/summer, Tokyo date rollover, spring DST gaps, fall overlaps, explicit offsets, floating values, elapsed duration, and cross-zone sorting. TypeScript, Raycast lint, and build passed. These were isolated automated checks, with no Morgen requests or new events. No additional live cross-zone test was performed.
