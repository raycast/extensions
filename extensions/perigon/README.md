# Perigon for Raycast

Search Perigon news, story clusters, and monitors from Raycast, and use the hosted Perigon MCP server in Raycast AI. You need a [Perigon](https://perigon.io) account in your organization.

## Setup

1. Install the extension from the Raycast Store.
2. **Raycast AI (MCP):** Open **Manage MCP Servers**, find **Perigon**, and sign in with your Perigon account. Use **Ask Perigon** or mention `@Perigon` in AI Chat. Mention skills `@News Research` or `@Monitor Insights` when relevant.
3. **Native commands** (Search News, Search Stories, My Monitors): Run a command and complete **Connect to Perigon** when prompted. This sign-in is separate from the MCP connection but uses the same Perigon account.

OAuth access lasts about 30 days; sign in again when a command asks you to.

## Commands

| Command        | Description                                                                            |
| -------------- | -------------------------------------------------------------------------------------- |
| Search News    | Typeahead search of recent articles with detail and open-in-browser actions            |
| Search Stories | Clustered stories (requires clusters scope on your org)                                |
| My Monitors    | List monitors; open events for EVENT/MENTIONS monitors or briefings for TOPIC monitors |
