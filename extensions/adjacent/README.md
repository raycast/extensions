# Adjacent for Raycast

Keyboard client for the Adjacent API (`find` / `list` / `get` / `price`).

## Install

```bash
git clone git@github.com:adjacentresearchxyz/raycast-extension.git
cd raycast-extension
npm install
npm run dev
```

Import the folder in Raycast if `yarn dev` does not attach.

## API key

Raycast → Extensions → Adjacent. Optional. Without a key, lists and prices use the 15-minute public snapshot. News, candles, similar, trades, and quotes need a key.

## Commands

| Command | What it does |
| --- | --- |
| Browse | Events, markets, indices, and rates. |
| Search | Find events, markets, indices, and rates. |
| News | Latest headlines (key required). |
| Menu Bar | Live index levels, cycling every 15s (configurable). |

## AI tools

`find`, `get`, `list`, `price` — same verbs as the hosted MCP.
