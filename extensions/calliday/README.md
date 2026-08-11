# Calliday for Raycast

Calliday's time tracking at your fingertips. Six commands, all reading the
local database through the `calliday` CLI — nothing leaves your Mac:

- **Current Activity** — what's being tracked right now, today's total, and
  the running timer (with a stop action).
- **Today's Report** — today by project, app, and site, with the
  productivity score.
- **Search Activity** — find a file or page you've spent time in, then jump
  to it on Calliday's timeline (filtered to that one thing), open it, or
  reveal it in the Finder.
- **Tomatoes** — the one on the vine (with a give-up action) and today's
  harvest, run by run.
- **Start a Tomato** — plant a pomodoro straight from Raycast; Calliday
  notifies you when it's ripe.
- **Start Timer** — begin a manual timer with a name, without opening
  anything.

## Requirements

- Calliday installed with the command-line tool
  (Calliday → Settings → General → Install Command-Line Tool — or the
  default install path is used automatically).

## Development install

```sh
cd raycast
npm install
npm run dev     # opens Raycast in development mode with the extension live
```

After the first `npm run dev`, the extension stays available in Raycast
(search "Calliday"). The CLI path can be overridden in the extension's
preferences if Calliday lives somewhere unusual.
