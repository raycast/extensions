# Webhook Sender Changelog

## [Quick Send & Shortcuts] - {PR_MERGED}

### Added

- Send a saved webhook directly with Enter, then view the response

### Changed

- Saved webhooks: ⌘↵ now opens the webhook in the form
- Delete shortcut is now ⌘D for saved webhooks and history entries
- Clear all history shortcut is now ⌘⇧D
- Windows shortcuts: Ctrl+S opens in form, Ctrl+D deletes, Ctrl+Shift+D clears all history

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
