# Plaud

Browse your [Plaud](https://www.plaud.ai) AI recorder notes from Raycast and copy links to them.

This is an unofficial community extension, not affiliated with Plaud.

## Setup

The extension uses the official [Plaud CLI](https://docs.plaud.ai/plaud-mcp-cli/cli) for authentication:

```
npm install -g @plaud-ai/cli
plaud login
```

`plaud login` opens your browser for OAuth sign-in. Tokens are stored in `~/.plaud/tokens.json` and refreshed automatically — no credentials are stored in Raycast.

## Commands

- **Search Recordings** — browse and search your recordings; open in browser (↵), copy a link (⌘↵), or copy the title (⌘⇧C)
