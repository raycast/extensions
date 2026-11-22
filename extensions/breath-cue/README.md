# Breath Cue

A calm, full-screen breathing overlay that shows up by itself at the right moment. There is nothing to configure: turn on **Work Status** once and Breath Cue watches what kind of work you are doing and picks the moment.

## How it decides

Once a minute, the menu bar command takes a small local snapshot:

- the frontmost app (grouped into deep work, messaging, browsing, calls, leisure),
- how long since your last keyboard or mouse input,
- whether any microphone is in use (a reliable "on a call" signal for Zoom, Meet, Slack huddles, FaceTime…),
- whether the screen is locked.

From that it keeps your current status in the menu bar (`Focus 42m`, `Call 18m`, `Scattered`, `Away`) and brings up a breathing overlay when:

| Moment | When | Breathing |
| --- | --- | --- |
| After a call | A call of 10+ minutes just ended and you're back at the keyboard | 3 physiological sighs (~30 s) |
| After long focus | 50+ minutes of deep work, at your next natural pause (switching apps or stopping to think); at 90 minutes regardless | Box breathing 4-4-4-4 (~1 min) |
| Scattered | Hopping between 4+ apps for 10 minutes | 5 slow exhales (~50 s) |

It never interrupts while a microphone is in use (any call), while you're away or the screen is locked, between 23:00 and 7:00, or more than 10 times a day. It also stays quiet while one of these apps is in front: Zoom, FaceTime, Keynote, PowerPoint, QuickTime, IINA, VLC, Apple TV, OBS, Screen Sharing, Steam, Photo Booth. Video playing inside a browser is not detected.

It learns from you: skipping a cue (click or `Esc`) makes it wait longer next time; finishing one makes it a little more eager. Skip the same kind of cue three times in a day and it stays quiet about it until tomorrow.

Everything stays on your Mac. Nothing is sent anywhere.

## Commands

- **Work Status** — menu bar status, today's summary, pause and resume. This is the one that runs in the background; enable it once.
- **Breathe Now** — start a one-minute breathing overlay right away. Assign a hotkey if you like.
