# Meeting Room Check

See which meeting rooms are free right now, right from Raycast, and block one
instantly — no need to open Google Calendar.

## What it does

- Lists every configured meeting room, grouped by floor, with live
  availability pulled from Google Calendar.
- Free rooms show how long they're free for (color-coded: green, orange,
  red as it gets close to being booked). Occupied rooms show how long until
  they free up.
- Block a room for 15 min, 30 min, 1 hour, or exactly until its next
  meeting — creates a real Google Calendar event with the room invited,
  same as booking it manually.
- Works for any Google Workspace organization, not just one company —
  see **Room setup** below.

## Room setup

On first use, you'll be asked how to build your room list:

- **Pull Rooms from My Calendar** — tries an automatic import first (only
  works if your account has Workspace admin rights), then falls back to
  scanning your own calendar history for rooms you've already booked and
  lets you pick which ones to track.
- **Import Room List** — paste a room list a colleague already exported
  for you (see Manage Rooms below). Fastest option if someone at your
  company already set this up.
- **Add Rooms Manually** — type in a room's name and calendar email
  directly.

Once set up, open **Manage Rooms** (⌘M from the room list) any time to:

- Recheck all rooms' validity (flags rooms that were renamed or removed)
- Export your room list as JSON to share with a teammate
- Import a list someone shared with you (merges by calendar email, doesn't
  wipe your existing rooms)
- Add a room manually or remove one

## Notes

- Requires a Google Workspace account. Personal Gmail accounts don't have
  bookable meeting room resources.
- Listing rooms automatically requires Workspace admin rights, which most
  accounts don't have — that's expected, not a bug. The calendar-scan and
  manual/import paths cover everyone else.
- Your room list is stored locally on your machine (Raycast's local
  storage), never sent anywhere else.
