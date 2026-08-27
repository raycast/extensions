<div align="center">
    <br/>
    <br/>
    <img src="./assets/calendly-icon.png" alt="calendly" width="100"/>
    <h3>Calendly</h3>
    <p>Manage meetings, event types, and bookings from Raycast</p>
    <br/>
    <br/>
</div>

Calendly is a Raycast extension that lets you review upcoming meetings, share event types and availability, and book invitees from Raycast or Raycast AI.

Sign in with Calendly when Raycast prompts you. The extension uses OAuth 2.1 with PKCE, so you never paste an API token.

## Features

- Browse the next 90 days of meetings, grouped by Today, Tomorrow, and date
- Join a meeting, copy the join link or invitee email, reschedule in the browser, or cancel with confirmation
- Browse active event types with duration, kind, and scheduling URL
- Copy a reusable scheduling link, the next available times, or a one-time booking link
- Book an invitee into a verified open slot from Raycast or Raycast AI
- Mention `@calendly` in Raycast AI to list meetings, check availability, create links, book, or cancel

Direct booking uses Calendly's Scheduling API and is available only for accounts and plans that support it.

## Commands

### Upcoming Meetings

Lists your active Calendly meetings for the next 90 days. Search by meeting name, invitee name, email, or location.

| Action             | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| Join Meeting       | Opens the video or location URL in the browser                |
| Copy Meeting Link  | Copies the join URL                                           |
| Copy Invitee Email | Copies the first invitee's email                              |
| Reschedule Meeting | Opens the invitee's Calendly reschedule page                  |
| Cancel Meeting     | Cancels the meeting after confirmation; invitees are notified |

### Event Types

Lists your active event types with duration and scheduling URL.

| Action                    | What it does                                                             |
| ------------------------- | ------------------------------------------------------------------------ |
| Copy Scheduling Link      | Copies the reusable event type URL                                       |
| Open Scheduling Page      | Opens the event type in the browser                                      |
| Copy Next Available Times | Copies the next 5 open times in the next 7 days, plus the scheduling URL |
| Create Single-Use Link    | Creates a one-time booking URL and copies it                             |
| Book Meeting              | Opens the booking form with this event type selected                     |

### Book Meeting

Books an invitee into an open slot. Choose an event type, enter name and email, pick a time from the next 7 days, and optionally choose a location. The chosen slot is re-checked immediately before booking so you are not writing to a time that has already been taken.

The form uses your local timezone. Booking asks for confirmation before it creates the invitee.

## Raycast AI

Mention `@calendly` in Raycast AI to work with your calendar in conversation. Write tools show a confirmation before they change anything; canceling a meeting uses a destructive confirmation.

| Tool                   | What it does                                                             |
| ---------------------- | ------------------------------------------------------------------------ |
| List Meetings          | Lists scheduled meetings in a date range (defaults to the next 30 days)  |
| Get Meeting            | Returns a meeting and its invitees, including reschedule and cancel URLs |
| List Event Types       | Lists your active event types, durations, locations, and scheduling URLs |
| Find Available Times   | Finds open times for an event type (at most 7 days per request)          |
| Create Single-Use Link | Creates a one-time scheduling link for an event type                     |
| Book Meeting           | Books an invitee into a verified available time                          |
| Cancel Meeting         | Cancels a scheduled meeting and notifies invitees                        |

## Authentication

The extension signs in with a native Calendly OAuth app. Raycast stores the tokens; the extension never ships a client secret.

Required scopes:

- `users:read`
- `event_types:read`
- `availability:read`
- `scheduled_events:read`
- `scheduled_events:write`
- `scheduling_links:write`

### Developer OAuth setup

If you are running a fork or creating your own Calendly OAuth app:

1. Create a **native** Calendly OAuth app for the target environment.
2. Register `https://raycast.com/redirect?packageName=Extension` as its exact redirect URI. Raycast uses the literal `Extension` value for its static web OAuth redirect; do not replace it with the package name.
3. Enable the scopes listed above.
4. Put the app's public client ID in `src/oauth/calendly.ts`.

Do not add the Calendly client secret to the extension. Raycast extensions are public native clients and cannot keep secrets.

## Development

```sh
npm install
npm run dev
```

`npm run dev` starts the extension in Raycast with hot reload. Run `npm run lint` and `npm run build` before publishing.

## License

MIT
