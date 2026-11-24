# TablePro Changelog

## [Fixes] - 2026-10-10

- Access errors from current TablePro versions show as Access Denied.
- A failed query shows its error.
- Denying in TablePro ends pairing with a message.
- The approval sheet in TablePro shows the client name with spaces, not plus signs.
- A turned-off MCP server or an outdated TablePro shows its own message.
- The extension no longer reads or deletes TablePro's handshake file.
- TablePro is found by its bundle ID. A new MCP Port preference replaces the TablePro App preference.
- On TablePro 0.38 to 0.66, a revoked or expired token and a lockout show their own messages.
- After TablePro refuses the API token, the extension stops sending it until you pair again, so it no longer locks other MCP clients out.
- A query no longer fails with "Session not found" after TablePro restarts or ends an idle session.

## [Initial Version] - 2026-05-22

First release. Pair the extension with TablePro and drive the app from Raycast and Raycast AI.

### Commands

- **Search Connections**: list saved connections, open one in TablePro, copy a deep link.
- **Open Connection**: open a connection by name from the Raycast root.
- **TablePro Menu Bar**: show recent connections and quick actions in the menu bar.
- **Search Schema**: drill into databases and schemas across connections.
- **Search Tables**: pick a connection, list tables, copy DDL, open a table tab.
- **Recent Tabs**: show tabs currently open in TablePro and reopen one.
- **Run Query**: paste SQL, pick a connection, preview rows in Raycast or open the full grid in TablePro.
- **Search Query History**: full-text search across the TablePro query history.
- **Pair with TablePro**: issue or refresh the API token using PKCE.

### AI tools (12)

- Schema: `list-connections`, `list-databases`, `list-schemas`, `list-tables`, `describe-table`, `get-table-ddl`.
- Query: `run-query` (mutating SQL routes through `Tool.Confirmation`), `explain-query`.
- Workflow: `open-connection-window`, `search-history`, `get-connection-status`, `list-recent-tabs`.
