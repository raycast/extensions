# Beeper Changelog

## [Manual Token Auth + Code Cleanup] - {PR_MERGE_DATE}

### Added
- **Manual Access Token support**: Users can now paste a token from Beeper Desktop (Settings → Integrations → Approved connections) directly into extension preferences. When set, the entire OAuth flow is bypassed — the token is used as a Bearer token for all requests. This fixes the OAuth redirect_uri mismatch bug that prevented some users from authenticating.
- New `manualToken` preference field (password type, optional, defaults to empty)
- `withBeeperAuth()` smart auth wrapper: automatically selects between manual token mode (no OAuth gate) and standard OAuth flow based on preferences
- `isUsingManualToken()` helper to check current auth mode

### Changed
- All command entry points (`chat.tsx`, `contacts.tsx`, `focus-app.tsx`, `list-accounts.tsx`, `search-messages.tsx`, `unread-chats.tsx`) now use `withBeeperAuth()` instead of `withAccessToken(createBeeperOAuth())`
- `getBeeperDesktop()`, `getAccessTokenValue()`, and `checkBeeperConnection()` now resolve tokens from either manual preferences or OAuth automatically
- 401 error messages now differentiate between manual token expiry and OAuth re-authorization
- Contributors list updated

### Removed
- Unused `ensureOAuthClientRegistered()` function (dead code from OAuth experimentation)
- `(prefs as any)` cast replaced with properly typed `as Record<string, unknown>`

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