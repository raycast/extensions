# desk.ly Changelog

## [Seat Availability + Descriptive Errors] - 2026-08-18

- Book a Seat: seat list now correctly excludes seats that are occupied or not allowed to be booked
- Check-in failure toast now shows the API's human-readable error title instead of the raw error response

## [More flexible Booking] - 2026-07-21

- Book a Seat: pick any available seat by Location → Floor/Room → Timeframe, instead of being limited to favorite seats
- Timeframes are now selected interactively (sourced from the account's available locations); removed the fixed "Booking Time" preference
- Favorite seats are still surfaced first in the seat list (⭐)
- Refactored the API client and commands for consistency and maintainability

## [Initial Version] - 2026-07-19
