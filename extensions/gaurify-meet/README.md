# Gaurify Meet for Raycast

See your next meetings, join in one keystroke, and share open times without leaving the keyboard.

## Commands

| Command | What it does |
| --- | --- |
| Upcoming Meetings | Your meetings, grouped by day. Join, copy the link or email, cancel, or open the app. |
| Copy Booking Link | Copies your booking page link. No window. |
| Copy Meeting Type Link | Pick a meeting type and copy its link. |
| Find Open Time | Your next open times. Copy three of them with your link, ready for an email. |
| New Meeting | Pick one of your open times or type your own, then book. The guest gets the invite. |
| Join Next Meeting | Opens the join link of the meeting on now or next. No window. |
| Share Open Times | Copies three open times and your link. No window. |
| Open Gaurify Meet | Opens your Gaurify Meet. |
| Next Meeting | Your next meeting in the menu bar, like "10:30 Asha". Refreshes every 5 minutes. |

## Setup

1. Open Gaurify Meet: Settings > API & webhooks.
2. Create a key. It starts with `gm_live_`. Copy it, it is shown once.
3. Run any Gaurify Meet command in Raycast and paste the key when asked.

Base URL is optional. Leave it empty to use `https://meet.gaurifyhq.com`.

## Develop

```sh
npm install
npm run dev     # loads the extension into Raycast and live reloads
npm run build   # ray build
npm run lint    # ray lint (ESLint, Prettier, package.json, icons)
```

## Store screenshots

The Raycast Store wants 3 to 6 screenshots in a `metadata/` folder, 2000 x 1250 PNG.

1. Run `npm run dev` with a real key and a few real meetings on the calendar.
2. Open Raycast settings > Advanced > enable "Window Capture" and set its hotkey.
3. Open each view and press the hotkey. Save to `metadata/gaurify-meet-1.png` and so on:
   Upcoming Meetings with details, Find Open Time, New Meeting, Copy Meeting Type Link.
4. Use a calm wallpaper and no personal guest data (use test guests).

## Privacy

The API key lives in Raycast's encrypted preferences. It is only sent to your Gaurify Meet base URL.
