# Moment

Moment is a focus timer for iPhone, iPad, Mac, Apple Watch and Vision Pro. This extension runs Moment's timer on the Mac from Raycast. It starts a focus session, pauses and resumes it, adds time, stops it, and shows how long is left. Raycast AI can do the same.

## Requirements

- **Moment for Mac 2.2 or later**, from the Mac App Store or Setapp. An older version shows a message to update it.
- **Permission for Raycast to control Moment.** macOS asks once for each copy of Moment, on its first command: choose Allow. The setting is in System Settings › Privacy & Security › Automation › Raycast › Moment.

## Commands

| Command      | Action                                    |
| ------------ | ----------------------------------------- |
| Start Focus  | Starts a focus session                    |
| Pause Timer  | Pauses the focus session or break         |
| Resume Timer | Resumes the paused focus session or break |
| Add Time     | Adds minutes to the focus session or break |
| Stop Timer   | Ends the focus session or break           |
| Time Left    | Shows how long is left                    |

Start Focus and Add Time take an optional number of whole minutes, from 1 to 90. Without one, Start Focus uses the timer's own length and Add Time adds 5 minutes. A session runs for 90 minutes at most.

Start Focus doesn't replace a focus session or break in progress. Its message names what is running and how long is left.

## Raycast AI

Mention `@moment` in Raycast AI to start, pause, resume, add time to or stop the session in progress, or to ask how long is left. Raycast asks for confirmation before it starts, pauses, resumes, adds time to or stops a session. Raycast AI needs a Raycast Pro plan.

## Privacy

Raycast and Raycast AI receive only the timer in progress: whether a focus session or break is running or paused, the time left, and the session's length. They never receive an intention, Stats, feelings or past sessions. Raycast AI sends what the tools return to its AI provider.
