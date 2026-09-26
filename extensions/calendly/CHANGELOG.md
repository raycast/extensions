# Calendly Changelog

## [Meeting Management and Raycast AI] - {PR_MERGE_DATE}

- Use one Calendly connection for Share Meeting Link, meeting management, and AI tools.
- Browse upcoming meetings and event types, check availability, create single-use links, and book or cancel meetings directly from Raycast.
- Manage Calendly through Raycast AI with tools for meetings, event types, availability, booking, and cancellation.
- Handle event types without locations and round-robin bookings, and collect required invitee phone numbers or meeting locations.
- Add support for Windows.

## [Added event duration] - 2026-04-12

- Display event duration as a right-aligned accessory on each event type

## [Maintenance] - 2026-03-16

- Update axios to ^0.30.3 to address CVE for denial of service via `__proto__` key in `mergeConfig`
- Update TypeScript to ^5.8.3 to fix build errors with modern @types/node

## [Update] - 2023-03-01

- Increased events fetched from 20 to 100.

## [Update] - 2022-09-12

- OAuth Support 🎉
