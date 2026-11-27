# Recordist

Search the meetings [Recordist](https://recordist.app/?from=raycast) recorded, read their summary, decisions and action
items, and start, stop and mark a recording, from Raycast.

Recordist records your calls with no bot in the meeting, writes the transcript and the notes, and keeps the record with
you. This extension talks to the Recordist app on your own machine, at `127.0.0.1`, and to nothing else.

## What you need

The Recordist app, running: [recordist.app/download](https://recordist.app/download?from=raycast). It is free to
record, transcribe and search.

## Setup

None. The extension uses the token Recordist keeps for your own tools, the same one the Recordist MCP gateway uses, so
it works as soon as Recordist has been opened once.

To give the extension a token of its own instead, open Recordist, go to **Settings, Integrations, New token for another
program**, name it Raycast, and paste the token into this extension's **Token** preference. You can revoke it there at
any time.

## Commands

- **Search Meetings:** find a meeting by what was said or by its title, and read its summary, decisions and action items
  beside the list. Show the transcript, copy the notes or the action items, or copy the whole meeting as Markdown.
- **Start Recording:** asks Recordist to record. By default Recordist brings up its own card, and nothing records until
  you answer it there. If you turned on **Allow agents to start recordings** in Recordist (Settings, Integrations), the
  recording starts at once, unless you tick **Always show Recordist's card before recording** in this command's
  preferences.
- **Stop Recording:** stops the recording; Recordist then writes it up.
- **Add Marker:** marks this moment in the recording, with an optional label.
- **Open Recordist:** brings Recordist to the front, or opens its download page if it is not installed.

## When Recordist is not running

Each command says so and offers to open Recordist. Recordist listens on port 47321 only while it runs.

## Privacy

The extension sends requests only to Recordist on `127.0.0.1:47321`. It has no analytics, and it never sends your
meetings anywhere. Recordist's own privacy policy: [recordist.app/privacy](https://recordist.app/privacy).
