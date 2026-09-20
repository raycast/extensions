# Baalda setup

Baalda for Raycast connects to Baalda's MCP endpoint. Configure these required preferences before using the commands or AI tools:

1. **Baalda Server URL**: use `https://api.baalda.com` for the managed service, `http://localhost:3010` for a local server, or the URL of your self-hosted server.
2. **MCP Token**: in the Baalda desktop app, open **Vault Settings → MCP → Create token**. The token starts with `mcp_` and uses the same vault and folder permissions as your Baalda account.

Optional preferences:

- **Default Vault ID**: set this to skip vault selection. Copy a vault ID from **Browse Vault**.
- **Capture Folder**: set an existing vault-relative folder, such as `Inbox`, for Quick Capture notes.

Requests are sent to the configured Baalda server at `<server>/api/mcp` using the MCP token. The extension does not configure analytics or separate telemetry.
