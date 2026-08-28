# Desk.ly for Raycast

Manage your [desk.ly](https://desk.ly) desk-sharing bookings directly from Raycast — view upcoming bookings, book a seat, and keep an eye on today's reservation without leaving your keyboard.

> **Disclaimer:** This extension is an independent community project and is not affiliated with, endorsed by, or officially supported by desk.ly or its operators.

## Commands

### My Bookings

Displays a list of your upcoming desk.ly reservations grouped by day. Each entry shows your name, the seat, and optionally the location, floor, and room (configurable in preferences). Open any booking to see a room floor plan with your seat highlighted. You can delete bookings directly from the list or the detail view. You can also "check-in" your booking from the list or the booking-view.

### Book Seat

Opens a form to create a new booking from your saved favorite seats. The date is pre-filled with the next bookable weekday after your most recent reservation, based on your weekday preferences. You can adjust the date, seat, and time range (Full Day, Morning, Afternoon, or a custom HH:MM interval). The booking window is capped by your account's maximum advance booking limit.

### Today's Booking

A background command that runs every 15 minutes and keeps its subtitle up to date with your current-day booking (seat name, floor, and room), or "No booking today" when nothing is scheduled. When launched manually it opens today's booking detail view, or jumps straight to **Book Seat** if you have no booking yet.

### Who Is in Office

Shows a list of colleagues who are booked in the office today, grouped by floor and room. Use the location dropdown to switch between office locations. Your own booking includes a **Check In** action and the option to delete the booking.

## Setup

### 1. Get your Refresh Token

The extension authenticates with desk.ly using a refresh token stored in your browser session:

1. Open [app.desk.ly](https://app.desk.ly) in your browser and log in.
2. Open the browser's developer tools:
   - **Chrome / Edge:** `F12` → **Application** tab → **Storage → Cookies** → select `https://app.desk.ly`
   - **Firefox:** `F12` → **Storage** tab → **Cookies** → select `https://app.desk.ly`
   - **Safari:** Enable the Develop menu first, then `Develop → Show Web Inspector` → **Storage** → **Cookies**
3. Find the cookie named **`refreshToken`** and copy its value.

### 2. Configure the Extension

Open Raycast, search for any Desk.ly command, and press `⌘` `⏎` to open its preferences (or go to `Raycast Settings → Extensions → Desk.ly`):

| Preference               | Required | Description                                                                               |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------- |
| **Refresh Token**        | Yes      | The `refreshToken` cookie value copied above                                              |
| **API URL**              | No       | Override if you use a self-hosted desk.ly instance (default: `https://app.desk.ly`)       |
| **Show Time**            | No       | Show the booking time range as an accessory in booking lists (default: on)                |
| **Show Location**        | No       | Show the location name as an accessory in booking lists (default: off)                    |
| **Show Floor**           | No       | Show the floor name as an accessory in booking lists (default: on)                        |
| **Show Room**            | No       | Show the room name as an accessory in booking lists (default: on)                         |
| **Seat Indicator Color** | No       | Color of the seat dot on the room floor plan — Blue, Red, Green, or Black (default: Blue) |
| **Seat Indicator Size**  | No       | Size of the seat dot on the room floor plan — S, M, or L (default: M)                     |

## Notes

- The refresh token is a long-lived credential. Treat it like a password — do not share it.
- If your token expires or becomes invalid, repeat the steps above to obtain a fresh one and update the preference.
- The extension caches a short-lived access token internally so that repeated commands do not trigger unnecessary network requests.
