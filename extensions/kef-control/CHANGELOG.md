# Kef Control Changelog

## [Fix] - 2026-05-10

- Fix Set Source and Set Volume commands silently doing nothing — the speaker's `setData` endpoint requires `POST` with a JSON body, not `GET` with the value in the query string.
- Surface API errors as toasts instead of swallowing them.

## [Initial Version] - 2025-07-11

Initial version