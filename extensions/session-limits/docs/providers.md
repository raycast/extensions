# Providers

## Custom snapshots

Any provider can appear alongside the built-in adapters. Write its measured quotas to a local JSON file and select that file under **Custom Providers** in the extension's preferences. The extension reads the file on refresh; your integration is responsible for collecting and updating its contents.

```json
{
  "version": 1,
  "providers": [
    {
      "id": "my-provider",
      "name": "My Provider",
      "plan": "Pro",
      "updatedAt": "2026-09-28T16:00:00Z",
      "dashboardUrl": "https://example.com/usage",
      "windows": [
        {
          "label": "Session",
          "usedPercent": 32,
          "resetAt": "2026-09-28T20:00:00Z"
        }
      ]
    }
  ]
}
```

This is illustrative data, not a live integration. Replace timestamps and percentages with measured values. A static file will become stale.

- `name`, `updatedAt`, and `windows` are required. `id`, `plan`, and `dashboardUrl` are optional.
- `id` must stay stable and unique across updates. Without an `id`, the provider name is its identity.
- Each window needs a `label` and numeric `usedPercent` from 0 to 100. `resetAt` is optional. Omit unavailable windows instead of writing zero.
- Timestamps use ISO 8601 with a timezone. `updatedAt` is the time of the actual provider observation, not the time the file was copied.
- Dashboard URLs must use HTTPS and have no embedded credentials. They are not fetched during refresh.
- A file can contain up to 30 providers, each with 1–20 windows, and must be at most 1 MiB. One invalid provider does not hide the others.
- Write a temporary file and rename it into place to avoid partially written JSON. Do not put credentials in a snapshot.

## Compatibility

| Adapter     | Setup                                                             | Usage source                                  |
| ----------- | ----------------------------------------------------------------- | --------------------------------------------- |
| Codex       | Existing subscription sign-in in the installed official Codex CLI | Codex app-server account rate limits          |
| Claude Code | **Connect Claude Code**, then use Claude Code 2.1.251+            | Documented status-line `rate_limits` metadata |

### Codex

The official Codex CLI owns authentication and its lifecycle. The selected profile directory, `$CODEX_HOME`, or `~/.codex` determines the profile. The extension starts the CLI app-server to read quota windows; it does not read authentication files or call private usage endpoints. Install and sign in to the official CLI before using this adapter.

The dashboard shows the account's main weekly limit, plus a 5-hour limit when Codex reports one. Separate reserve and model-specific pools are omitted. Window labels follow the reported duration.

### Claude Code

Choose **Connect Claude Code** once to add a local status-line integration to your Claude settings. The selected directory, `$CLAUDE_CONFIG_DIR`, or `~/.claude` determines the profile. Your existing status-line command is preserved. The integration runs locally when Claude Code updates its status line and saves only the reported quota windows and observation time for Raycast to read.

After connecting, use Claude Code and refresh Session Limits. Until Claude reports its first quota data, the dashboard shows **Waiting for Claude Code**. Readings update while Claude Code is active; pressing refresh in Raycast reads the latest saved observation and does not make Claude generate a new one. A quiet or closed Claude session can therefore leave an old reading.

Choose **Disconnect Claude Code** to remove the integration and restore the prior status-line setting when the installed setting still belongs to Session Limits. It does not overwrite unrelated settings changes you make later. A project-level status-line override can prevent the integration from receiving updates.

The extension does not read Claude credential files, access Keychain credentials, store tokens, or make requests to Anthropic usage endpoints. Claude Code manages its own authentication. See the [official status-line documentation](https://code.claude.com/docs/en/statusline) for the metadata and update behavior.

### Freshness and scope

Command openings share a 60-second snapshot cache; **⌘R** requests a new reading from the adapter. The dashboard updates age/reset labels while open but does not poll the network continuously. Raycast controls menu-bar scheduling and may delay background refresh.

The adapters expose only quota windows reported by the provider. Credits, spend, local transcript token estimates, and inferred allowances are outside this extension's scope. Failed refreshes and stale readings are labeled and excluded from the menu-bar total. A passed reset time does not establish that usage is zero.

Protocol references: [Codex app-server](https://developers.openai.com/codex/app-server) and [Claude Code status lines](https://code.claude.com/docs/en/statusline).
