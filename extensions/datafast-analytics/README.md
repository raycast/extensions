# DataFast Analytics Raycast Extension

Check Datafa.st analytics from Raycast.

## Commands

- Dashboard: overview metrics, realtime visitors, and top breakdowns.
- Visitors: search visitors by page, goal, location, device, campaign, or customer status.
- Create Goal: send a server-side custom goal event for a visitor.

## Setup

Add your DataFast API key in Raycast preferences:

- `df_` website API key: no website ID needed.
- `dft_` account token: add a website ID and make sure the token has the required scopes.

## Development

```bash
npm install
npm run dev
```

`npm run lint` checks code locally. Before publishing, set `author` in `package.json` to your Raycast Store username and run `npm run lint:raycast`.
