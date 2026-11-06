# Beeper Changelog

## [Awaiting Reply] - {PR_MERGE_DATE}

- New **Awaiting Reply** command: lists direct conversations where the other person sent the last message, with a message preview, how long they've waited, and a network filter
- Mark a conversation as handled (⌘D) to hide it until they write again
- Hand off a reply draft to Beeper without sending it
- New **Awaiting Reply Count** menu bar command

## [Bug Fix] - 2026-09-20

- Switched authentication to Raycast's app redirect so Beeper accepts the OAuth callback

## [Bug Fix] - 2026-05-18

- Limited chat message loading to one page at a time to avoid memory pressure in large conversations

## [Windows Support] - 2026-04-13

### Added

- Windows platform support
- Windows-compatible Beeper app detection in `getBeeperAppPath()`

## [Initial Release] - 2026-04-13

### Added

- AI tools surface in extension metadata (`tools` + `ai.evals`)
- Tool handlers for `open-chat`, `send-message`, `list-accounts`, `search-messages`, `summarize-unread`, and `summarize-messages`
- Fuzzy contact/chat intent matching with suggestion messages
- Service normalization and display helper mappings
- Non-UI auth fallback for tools via `LocalStorage` token fallback
- Optional `useMockData` preference and mock datasets for demos/screenshots
- Connected Accounts command UI (`list-accounts`)
- Additional metadata screenshot: `metadata/beeper-3.png`
