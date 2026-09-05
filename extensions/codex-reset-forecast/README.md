# Codex Reset Forecast

View the unofficial Codex reset forecast and recent reset history from
[Will Codex Reset?](https://www.willcodexquotareset.com/) in Raycast.

## Commands

- **Check Reset Forecast** shows the current likelihood, latest confirmed reset,
  and recent forecast changes.
- **Toggle Reset Forecast in Menu Bar** shows or hides an indicator containing
  either the reset likelihood or time since the latest confirmed reset. The
  indicator refreshes approximately every 30 minutes when Raycast background
  refresh is enabled.

No setup is required for the list command. The menu bar defaults to reset
likelihood. To show time since the latest reset instead, open Raycast Settings,
select Extensions → Codex Reset Forecast → Refresh Menu Bar Forecast, and change
the command's **Menu Bar Display** preference.

## Data and Privacy

The extension reads the public forecast JSON published by
`willcodexquotareset.com`. It does not authenticate with OpenAI, inspect an
individual account, calculate the forecast, collect personal data, or include
analytics.

Forecast data provided by willcodexquotareset.com. Unofficial and not affiliated
with OpenAI.

## Development

Node.js 24 is pinned in `.nvmrc` for local development. Raycast Store
dependencies are managed with npm and committed in `package-lock.json`.

```bash
nvm use
npm ci
npm run dev
```

## Store Submission

Before publishing:

```bash
npm test
npm run test:contract
npm run typecheck
npm run lint
npm run build
```

Then test the production build in Raycast, confirm permission to consume the
upstream forecast endpoint, and capture three to six 2000×1250 PNG screenshots
into `metadata/`. Submit with `npm run publish`.
