# Superhuman Changelog

## [MCP Integration] - {PR_MERGE_DATE}

- Connect to Superhuman's official MCP server (`https://mcp.mail.superhuman.com/mcp`) via OAuth 2.1 (PKCE + Dynamic Client Registration).
- `draft-email` now creates a real draft server-side and returns a draft id (was: deep link only).
- `search-inbox` now returns inline results from `query_email_and_calendar` (was: deep link only).
- Added 17 new AI tools: `send-draft`, `discard-draft`, `undo-send`, `get-thread`, `get-message`, `list-threads`, `list-labels`, `list-splits`, `get-attachment`, `get-read-status-feed`, `mark-spam`, `trash-thread`, `unsubscribe`, `update-thread`, `update-personalization`, `create-or-update-event`, `get-availability`.
- Confirmation dialogs on destructive/sending tools (`send-draft`, `discard-draft`, `mark-spam`, `trash-thread`, `unsubscribe`, `create-or-update-event` with attendees).
- Migrated `ai.yaml` (instructions + evals) into `package.json` under `ai.instructions` / `ai.evals`; expanded eval coverage to one happy-path per new tool.

## [Initial Version] - 2025-04-29
