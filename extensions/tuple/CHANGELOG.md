# Tuple Changelog

## [Compact Transcript Timestamps] - 2026-08-25

- Transcript views and AI summaries keep compact clock timestamps as Tuple shifts its CLI default to full RFC3339 instants.

## [Smarter Calls and Rooms] - 2026-08-20

- **Contacts** now show only the call action that person can accept: start when they're online, join when their call has room, and neither when they're offline or the call is full. Favorites, search, and Copy Email still work for everyone.
- Full calls now say **Call Full** instead of **In a Call**, so it's clear why Join Call isn't available.
- Raycast reports success only after a call connects. Joining a contact or room switches cleanly from your current call.
- **Join Personal Room** now chooses Tuple's primary room instead of relying on list order, and Search Rooms labels that room explicitly.
- Ask Raycast AI who is pairing right now to get Tuple's grouped view of active calls.
- Call failures now use the CLI's typed errors for more accurate guidance, with compatibility fallbacks for older Tuple builds.

## [New Tuple Integration] - 2026-06-26

- **Calls**: browse contacts with live online/busy status, favorites, and recents; start a call; and run the active call from a menu-bar command — mute/unmute, add a person, copy an AI context prompt, or hang up. Toggle Mute and End Call ship as standalone commands for global hotkeys.
- **Rooms**: browse your personal and team rooms, see who's in each, and join, copy a link, or open in the browser — plus a one-shot Join Personal Room command.
- **Transcripts**: browse recent calls, full-text search what was said, read or export a transcript, start/stop transcription, and delete a recording.
- **AI** (Raycast Pro): Summarize with AI and Generate Title & Summary for any call, and ask Raycast AI about your calls, rooms, and contacts with `@tuple`. Without Pro, Copy AI Context brings a call into any assistant.

## [Deprecation] - 2024-04-22

Deprecated the current version while working on a better integration
