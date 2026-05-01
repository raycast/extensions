# TablePro

[TablePro](https://tablepro.app) is a native macOS database client. This extension talks to a running TablePro app over a local MCP server, so you can search saved connections, browse schema, and run queries from Raycast and Raycast AI. Database credentials stay in TablePro's Keychain.

## Setup

1. Install TablePro 0.37.0 or later from [tablepro.app](https://tablepro.app). The External API and pairing flow this extension uses landed in 0.37.
2. Run the **Pair with TablePro** command in Raycast.
3. TablePro shows an approval sheet. Choose the scope (read-only by default), pick which connections this token can reach, and approve.
4. The token lands back in Raycast automatically. You're done.

The MCP server starts on demand. You don't need to enable it manually.

## Commands

- **Search Connections**: list saved connections, open one in TablePro, copy a deep link.
- **Open Connection**: `Open Connection prod` from the Raycast root.
- **TablePro Menu Bar**: show recent connections and quick actions in the menu bar.
- **Search Schema**: drill into databases and schemas across connections.
- **Search Tables**: pick a connection, list tables, copy DDL, open a table tab.
- **Recent Tabs**: show tabs currently open in TablePro and reopen one.
- **Run Query**: paste SQL, pick a connection, preview up to 50 of 200 fetched rows in Raycast or open the full grid in TablePro. Mutating queries ask before running.
- **Search Query History**: full-text search across the TablePro query history.
- **Pair with TablePro**: issue or refresh the API token. Use `cmd+shift+k` on the form to sign out and clear the local token.

## AI tools

The extension exposes 10 tools to Raycast AI:

- `list-connections`, `list-databases`, `list-schemas`, `list-tables`, `describe-table`, `get-table-ddl`
- `run-query`, with mutating SQL routed through `Tool.Confirmation` showing connection name and SQL preview
- `explain-query`, `open-connection-window`, `search-history`

Try `@tablepro show me users in prod` or `@tablepro how big is the orders table on staging`.

## Permissions and access control

Each TablePro connection has an external-access setting (Blocked, Read-only, Read & Write). Tokens are issued with their own scope. The actual permission is the minimum of the two. A full-access token against a read-only connection cannot mutate.

If TablePro returns 403 for a write query, the extension surfaces the error verbatim. Change the connection's external access in TablePro under the connection editor.

## Pairing flow

The pairing flow uses PKCE so the local TablePro app and the extension agree on a token without ever sharing it through a URL.

1. Raycast generates a verifier (32 random bytes) and a SHA-256 challenge.
2. Raycast opens `tablepro://integrations/pair?...` with the challenge and a `raycast://` callback.
3. TablePro shows the approval sheet. On approve, TablePro mints a one-time code and opens the callback.
4. The extension POSTs the code plus verifier to the local exchange endpoint at `127.0.0.1:<port>/v1/integrations/exchange` and receives the token.
5. The token is stored in Raycast's encrypted extension storage.

The exchange endpoint takes no auth. The single-use code is the auth.

## Privacy

- Connection metadata (`name`, `host`, `port`, `type`) is read from `~/Library/Application Support/TablePro/connections.json`.
- Passwords are never read by the extension. They live in the TablePro Keychain.
- Query results are fetched on demand from the local MCP server at `127.0.0.1`.
- The extension makes no third-party network requests.

## Troubleshooting

- **TablePro is not installed**: install from tablepro.app or set the path in extension preferences.
- **TablePro is not running**: open TablePro. The MCP server starts on first request, you don't need to enable it.
- **The connection list is empty**: open TablePro at least once so it loads `~/Library/Application Support/TablePro/connections.json`. Connections you create later show up after the next list refresh.
- **API token was revoked**: run Pair with TablePro again. Tokens revoked from inside TablePro (Settings > Integrations > Tokens) need a fresh pairing.
- **Pairing got stuck**: close the Pair window and run the command again. Each run generates a fresh verifier, and verifiers expire after 5 minutes if the approval sheet is left open.
- **"This connection is read-only" on a write query**: the connection's External Access is set to Read-only or Blocked, or your token's scope is read-only. Change either in TablePro under the connection editor or under Settings > Integrations > Tokens.
- **A query times out**: TablePro hasn't connected to the database yet. Run **Open in TablePro** first, confirm the connection is live, then retry from Raycast.
- **Run Query says the result was capped**: TablePro applies a row safety cap (default 10,000 rows). Add an explicit `LIMIT` to your query, or open it in TablePro and click Fetch All.
- **Old plugins broken after a TablePro update**: separately distributed plugins ship per-version. Open TablePro > Settings > Plugins to update them. The Raycast extension keeps working even when a specific driver plugin is being updated.
