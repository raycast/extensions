# Webhook Sender Changelog

## [Quick Send & Shortcuts] - {PR_MERGE_DATE}

### Added

- Send a saved webhook directly with Enter, then view the response

### Changed

- Open in Form and Edit in Form now use the common Edit shortcut (⌘E / Ctrl+E)
- Delete for saved webhooks, history entries and form fields now uses the common Remove shortcut (⌃X / Ctrl+D)
- Clear all history now uses the common Remove All shortcut (⌃⇧X / Ctrl+Alt+D)
- Form and response shortcuts now work on both macOS and Windows: Save, Add Field, Copy Response (⌘⇧C / Ctrl+Shift+C), Copy Request Body (⌘⌥C / Ctrl+Alt+C)
- Saving a webhook now checks that raw JSON is valid

## [Initial Version] - 2026-05-06

### Added

- Initial release
- Send webhooks with GET, POST, PUT, PATCH, DELETE support
- Key-Value body mode with per-field type selector (string, boolean, number, null)
- Raw JSON body mode with validation before sending
- Live JSON preview while editing key-value fields
- Automatic history — last 50 webhooks saved with status and response
- View full response (status, body, response time) from history with a single Enter
- Edit any history item in the form with ⌘↵
- Save named webhooks for instant reuse across sessions
- Response view with pretty-printed JSON and plain-text fallback
- Color-coded status indicators (2xx green, 3xx yellow, 4xx/5xx red)
- Copy response body, request body, or URL from the response view
- Delete individual history entries or clear all history at once
- Delete saved webhooks with confirmation prompt
