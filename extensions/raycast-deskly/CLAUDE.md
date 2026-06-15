# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development mode with hot reload
npm run build        # Build the extension for production
npm run lint         # Run ESLint
npm run fix-lint     # Auto-fix lint issues
npm run publish      # Publish to Raycast store
```

There are no automated tests. Validate changes by running `npm run dev` and testing in Raycast directly.

## Architecture

This is a Raycast extension for managing [desk.ly](https://desk.ly) desk-sharing bookings. It uses token-based auth (refresh token stored in Raycast preferences) to call the desk.ly REST API.

### Commands (entry points)

- [src/next-bookings.tsx](src/next-bookings.tsx) — "Next Bookings" list view command; fetches current + next month bookings via `fetchBookings`, renders them grouped by day using `BookingList`; subtitle shows the next upcoming booking; supports `openTodayBooking` launch context to push directly into `BookingDetail`
- [src/todays-booking.tsx](src/todays-booking.tsx) — "Today's Bookings" no-view command; runs every 15 minutes in the background; fetches today's booking via `fetchBookings` and updates the command subtitle with seat name + time, or "No booking today"
- [src/book-a-seat.tsx](src/book-a-seat.tsx) — "Book a Seat" form command; loads favorite seats and existing bookings to suggest a default date (next weekday after the last booked date); validates date range against `maxBookingDays` from account info; calls `bookSeat()` on submit; supports `defaultDate` launch context

### Components

- [src/components/BookingList.tsx](src/components/BookingList.tsx) — reusable `List` fragment; groups bookings by day into `List.Section`s; each item navigates to `BookingDetail` and supports delete and open-in-browser actions; reads `showLocation`, `showFloor`, `showRoom` preferences for accessories
- [src/components/BookingDetail.tsx](src/components/BookingDetail.tsx) — `Detail` view for a single booking; fetches and renders the room floor plan image (with the seat highlighted as a blue dot) via `fetchRoomPlanImage`; shows metadata (date, time, seat, location, floor, room); supports delete and open-in-browser actions
- [src/components/DesklyEmptyView.tsx](src/components/DesklyEmptyView.tsx) — reusable `List.EmptyView` wrapper used for errors and empty states; always shows an "Open in Browser" action

### API layer

[src/api/deskly.tsx](src/api/deskly.tsx) is the sole HTTP client. Key functions:

- `fetchCalendar()` — homepage calendar endpoint; returns upcoming bookings with `seatBooked` field
- `fetchBookings(year, month)` — month-based endpoint; uses `seat` field instead of `seatBooked`
- `fetchFavoriteSeats()` — returns the user's favorite `BookingSeat[]` from `/de/api/user/favorite/seats`
- `bookSeat(date, seat)` — POSTs to `/de/api/resource-booking` to create a full-day booking (08:00–17:00)
- `deleteBooking(bookingId)` — DELETEs `/de/api/dayBooking/:id/delete`
- `fetchRoomPlanImage(roomId, seat)` — fetches the room plan PNG, overlays a blue circle at the seat's `locationX`/`locationY`, and returns a base64 `data:` URI; results are in-memory cached per `roomId:seatId`
- `fetchInformation()` — returns user info including `accountInformation.maxBookingDays`; caches result in `LocalStorage`
- `fetchAccessToken()` — exchanges the refresh token for a short-lived access token; caches in `LocalStorage` with expiration tracking; called automatically before every authenticated request

The two booking endpoints return structurally similar `Booking` objects but use different field names for the booked seat: `fetchCalendar` → `booking.seatBooked`, `fetchBookings` → `booking.seat`. The `renderSeatName()` utility handles both.

### Auth flow

1. Raycast preference `refreshToken` is the user's long-lived credential
2. Before any API call, `fetchAccessToken()` checks `LocalStorage` for a cached access token
3. If missing or expired, it posts to `/de/api/authorize/refreshToken` to get a new one
4. The access token is sent as `Authorization: Bearer <token>`

### Types

All shared interfaces live in [src/lib/types.tsx](src/lib/types.tsx): `Preferences`, `Booking`, `BookingSeat`, `AuthData`, `Information`.

`Preferences` now includes three display toggles: `showLocation`, `showFloor`, `showRoom`.

`BookingSeat` now includes `room` (room ID for floor plan fetch), `locationX`, and `locationY` (pixel coordinates for seat overlay).

`Information` now includes `accountInformation.maxBookingDays`.

### Utilities

[src/lib/utils.tsx](src/lib/utils.tsx) has rendering and action helpers:

- `renderBookingDate(booking)` — formats date as "Today", "Tomorrow", or weekday + optional time range
- `renderSeatName(booking)` — reads from `booking.seat` or `booking.seatBooked`; falls back to "Multiple bookings" or "No seat booked"
- `bookingIcon(booking, apiUrl)` — returns `CheckCircle` if checked in, profile image if available, or `Person` icon
- `confirmDeleteBooking(booking, onDeleted)` — shows a destructive confirmation alert, calls `deleteBooking()`, then re-triggers the `todays-booking` background command

### Configuration

The extension declares preferences in `package.json`:

- `apiUrl` — optional, defaults to `https://app.desk.ly`
- `refreshToken` — required; obtain from a desk.ly session
- `showLocation` / `showFloor` / `showRoom` — optional booleans; control which seat metadata columns appear in `BookingList`

Prettier is configured for 120-character line width with double quotes (see [.prettierrc](.prettierrc)).

## Documentation

Use context7 (via the `find-docs` skill) to look up Raycast API docs. Invoke it with `/find-docs` and pass a query like `"Raycast List.Dropdown props"`. The library IDs to prefer:

- `/llmstxt/developers_raycast_llms-full_txt` — most code snippets (4126), high reputation
- `/raycast/extensions` — largest snippet set (15307), includes real extension examples
- `/websites/developers_raycast` — official API reference
