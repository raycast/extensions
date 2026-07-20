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

- [src/my-bookings.tsx](src/my-bookings.tsx) — "My Bookings" list view command; fetches current + next month bookings via `fetchBookings`, renders them grouped by day using `OfficeList`; subtitle shows the next upcoming booking; supports `openTodayBooking` launch context to push directly into `BookingDetail`
- [src/todays-booking.tsx](src/todays-booking.tsx) — "Today's Booking" no-view command; runs every 15 minutes in the background; fetches today's booking via `fetchBookings` and updates the command subtitle with seat name + time, or "No booking today"
- [src/book-a-seat.tsx](src/book-a-seat.tsx) — "Book a Seat" form command; loads favorite seats and existing bookings to suggest a default date (next weekday after the last booked date); validates date range against `maxBookingDays` from account info; calls `bookSeat()` on submit; supports `defaultDate` launch context
- [src/who-is-in-the-office.tsx](src/who-is-in-the-office.tsx) — "Who Is in Office" list view command; calls `fetchPresentResources` for the selected location and today's date; groups results by floor/room using `OfficeList`; a `List.Dropdown` in the search bar lets the user switch between available locations (defaults to `user.primaryRoom.location` from account info); only the current user's own booking supports check-in and delete actions

### Components

- [src/components/OfficeList.tsx](src/components/OfficeList.tsx) — reusable `List` fragment shared by `my-bookings` and `who-is-in-the-office`; renders `OfficeListSection[]` (each with a title and `OfficeListItem[]`) into `List.Section`s; each item shows a profile image, title, subtitle, and optional accessories (check-in badge, time range, location, floor, room); navigates to `BookingDetail` when a booking is present; exposes optional `onCheckedIn` and `onDeleted` callbacks per item — only wired up when the caller wants those actions (e.g. the current user's own rows); reads `showTime`, `showLocation`, `showFloor`, `showRoom` preferences for accessories
- [src/components/BookingDetail.tsx](src/components/BookingDetail.tsx) — `Detail` view for a single booking; fetches and renders the room floor plan image (with the seat highlighted) via `fetchRoomPlanImage`; shows metadata (date, time, seat, location, floor, room); supports check-in, delete, and open-in-browser actions; accepts optional `personName` and `profileImage` props for display when viewing another person's booking
- [src/components/DesklyEmptyView.tsx](src/components/DesklyEmptyView.tsx) — reusable `List.EmptyView` wrapper used for errors and empty states; always shows an "Open in Browser" action

### API layer

[src/api/deskly.tsx](src/api/deskly.tsx) is the sole HTTP client. Key functions:

- `fetchBookings(year, month)` — month-based endpoint; returns `Booking[]` using the `seat` field
- `fetchFavoriteSeats()` — returns the user's favorite `BookingSeat[]` from `/de/api/user/favorite/seats`
- `bookSeat(date, seat, fromTime, untilTime)` — POSTs to `/en/api/resource-booking` to create a booking for the given time window
- `deleteBooking(bookingId)` — DELETEs a booking
- `checkInBooking(bookingId)` — POSTs a check-in for a booking
- `fetchPresentResources(locationId, date)` — returns `PresentPerson[]` for who is booked at a location on a given date; used by `who-is-in-the-office`
- `fetchRoomPlanImage(roomId, seat)` — fetches the room plan PNG, overlays a colored dot at the seat's `locationX`/`locationY` (color/size controlled by `seatIndicatorColor`/`seatIndicatorSize` preferences), and returns a base64 `data:` URI; results are in-memory cached per `roomId:seatId`
- `fetchInformation()` — returns user info including `accountInformation.maxBookingDays`, `user.primaryRoom`, and `availableLocations`; caches result in `LocalStorage`
- `fetchAccessToken()` — exchanges the refresh token for a short-lived access token; caches in `LocalStorage` with expiration tracking; called automatically before every authenticated request

`fetchBookings` returns `Booking` objects with the booked seat in the `seat` field. `renderSeatName()` also handles the `seatBooked` field for any legacy data.

### Auth flow

1. Raycast preference `refreshToken` is the user's long-lived credential
2. Before any API call, `fetchAccessToken()` checks `LocalStorage` for a cached access token
3. If missing or expired, it posts to `/de/api/authorize/refreshToken` to get a new one
4. The access token is sent as `Authorization: Bearer <token>`

### Types

All shared interfaces live in [src/lib/types.tsx](src/lib/types.tsx): `Booking`, `BookingSeat`, `AuthData`, `Location`, `PresentBooking`, `PresentPerson`, `Information`.

`Preferences` is **not** declared in `types.tsx`. Raycast auto-generates `declare type Preferences` (and per-command `Preferences.CommandName` subtypes) in `raycast-env.d.ts` from `package.json`. Use `getPreferenceValues<Preferences>()` for global prefs and `getPreferenceValues<Preferences.BookASeat>()` when command-specific keys (weekday toggles, `bookAtTime`) are needed. Never hand-write this interface — it will silently drift from the manifest.

`BookingSeat` includes `room` (room ID for floor plan fetch), `locationX`, and `locationY` (pixel coordinates for seat overlay).

`Booking` includes `userCheckedIn: boolean | null` — set by the API when the user has checked in for that day.

`Information` includes `accountInformation.maxBookingDays`, `user` (with `id`, `firstName`, `lastName`, `email`, `primaryRoom`), and `availableLocations: Location[]`.

`PresentPerson` represents a person booked in the office on a given day; it contains `dayBookings: PresentBooking[]`, each of which references a `BookingSeat` as `resource`.

### Utilities

[src/lib/utils.tsx](src/lib/utils.tsx) has rendering and action helpers:

- `renderBookingDate(booking)` — formats date as "Today", "Tomorrow", or weekday + optional time range
- `renderSeatName(booking)` — reads from `booking.seat` or `booking.seatBooked`; falls back to "Multiple bookings" or "No seat booked"
- `profileIcon(profileImage, apiUrl)` — returns a circular profile image if the URL is available, or `Icon.Person`; handles relative URLs by prepending `apiUrl`
- `confirmDeleteBooking(booking, onDeleted)` — shows a destructive confirmation alert, calls `deleteBooking()`, then re-triggers the `todays-booking` background command

[src/lib/format.ts](src/lib/format.ts) has pure date/time helpers (no Raycast imports):

- `pad2(n)` — zero-pads a number to 2 digits
- `toISODate(date)` — formats a `Date` as `YYYY-MM-DD`
- `renderTimeRange(from, until)` — formats `"HH:MM – HH:MM"` from nullable time strings; returns `undefined` if either is missing
- `isSameDay(a, b)` — compares two `Date` values by date string
- `relativeDay(date)` — returns `"Today"` or `"Tomorrow"` if applicable, else `null`

### Configuration

The extension declares preferences in `package.json`:

- `apiUrl` — optional, defaults to `https://app.desk.ly`
- `refreshToken` — required; obtain from a desk.ly session
- `showTime` — optional boolean; shows the booking time range as an accessory in list views
- `showLocation` / `showFloor` / `showRoom` — optional booleans; control which seat metadata columns appear in `OfficeList`
- `seatIndicatorColor` — optional dropdown; controls the color of the seat dot overlaid on room plan images
- `seatIndicatorSize` — optional dropdown; controls the size of the seat dot overlaid on room plan images

Prettier is configured for 120-character line width with double quotes (see [.prettierrc](.prettierrc)).

## Documentation

Use context7 (via the `find-docs` skill) to look up Raycast API docs. Invoke it with `/find-docs` and pass a query like `"Raycast List.Dropdown props"`. The library IDs to prefer:

- `/llmstxt/developers_raycast_llms-full_txt` — most code snippets (4126), high reputation
- `/raycast/extensions` — largest snippet set (15307), includes real extension examples
- `/websites/developers_raycast` — official API reference
