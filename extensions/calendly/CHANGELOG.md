# Calendly Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Sign in with Calendly OAuth to manage meetings from Raycast
- Browse upcoming meetings for 7, 30, or 90 days, then join, copy links, reschedule, or cancel
- Browse event types and copy scheduling links, the next available times, or a single-use booking link
- Book an invitee into a verified open slot from Raycast, including their timezone
- Use Raycast AI to list meetings, check availability, create links, book, or cancel

## [Added event duration] - 2026-04-12

- Display event duration as a right-aligned accessory on each event type

## [Maintenance] - 2026-03-16

- Update axios to ^0.30.3 to address CVE for denial of service via `__proto__` key in `mergeConfig`
- Update TypeScript to ^5.8.3 to fix build errors with modern @types/node

## [Update] - 2023-03-01

- Increased events fetched from 20 to 100.

## [Update] - 2022-09-12

- OAuth Support 🎉
