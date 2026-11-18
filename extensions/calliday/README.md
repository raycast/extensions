# Calliday for Raycast

The companion extension for [Calliday](https://calliday.app), an automatic,
private time tracker for macOS. This extension is an integration only — it
does not track time itself and cannot run on its own. Every command talks to
the Calliday app on your Mac through its local `calliday` command-line tool
and reads the app's local database. **Without the Calliday app installed, the
extension has nothing to show.**

## How this differs from other time-tracking extensions

Other Store extensions in this space are either self-contained trackers and
timers, or clients for other apps and web services (Tim, Toggl, Everhour,
Tomito, …). This one is exclusively a remote control and viewer for the
Calliday app:

- Calliday records your activity **automatically** in the background; there
  is nothing to start or log manually, and this extension simply surfaces
  what the app has already recorded.
- Everything stays **on your Mac**. There is no account, no web service, and
  no network request — the extension shells out to the local CLI and reads
  local data only.

## Commands

- **Current Activity** — what's being tracked right now, today's total, and
  the running timer (with a stop action).
- **Today's Report** — today by project, app, and site, with the
  productivity score.
- **Search Activity** — find a file or page you've spent time in, then jump
  to it on Calliday's timeline (filtered to that one thing), open it, or
  reveal it in the Finder.
- **Tomatoes** — the one on the vine (with a give-up action) and today's
  harvest, run by run.
- **Start Tomato** — plant a pomodoro straight from Raycast; Calliday
  notifies you when it's ripe.
- **Start Timer** — begin a manual timer with a name, without opening
  anything.

## Requirements

- The [Calliday](https://calliday.app) app for macOS, with its command-line
  tool (Calliday → Settings → General → Install Command-Line Tool — or the
  default install path is used automatically). The extension does nothing
  without it.

The CLI path can be overridden in the extension's preferences if Calliday
lives somewhere unusual.
