# Figa Raycast Extension

Raycast extension foundation for Figa external API integrations.

## Decisions

- Package location: `apps/raycast`.
- MVP auth: manual Figa `x-api-key` stored in a required Raycast `password` preference.
- Production API default: `https://api.figa.cc`.
- OAuth/pairing and Raycast AI tools are intentionally out of scope for this package skeleton.
- The package is standalone for Raycast Store publishing and does not import private monorepo workspace packages at runtime.

See `../../docs/raycast-extension-decision.md` for the architecture note.

## Local Development

Prerequisites:

- Raycast installed and signed in.
- Node.js 22.14 or newer.
- npm 7 or newer.

From this directory:

```sh
npm install
npm run dev
```

From the monorepo root:

```sh
pnpm -F figa dev
pnpm -F figa build
pnpm -F figa lint
```

Raycast preferences:

- `API Key`: a dedicated Figa workspace API key. Use read preset for read commands and write preset for mutation commands.
- `API Base URL`: keep `https://api.figa.cc` for production, or use a local API origin during development.

## Current Command

- `Show Workspace Context`: calls `GET /api/v1/context`, validates the configured key, and shows workspace context, plan tier, critical limits, safe error states, and shortcuts to API key settings and developer docs.

Expense read and mutation commands are tracked in #530 and #531.

## API Client Contract

The client in `src/api/client.ts`:

- trims trailing slashes from `apiBaseUrl`,
- sends `x-api-key`,
- sends `User-Agent: FigaRaycast/0.1.0 (Raycast)`,
- expects Figa response envelopes,
- normalizes common errors for Raycast commands: invalid key, paid-plan gate, insufficient permissions, route forbidden, validation errors, rate limits, network failures, and non-JSON responses.

Do not log or render the raw API key. Do not include real workspace data or API keys in Store screenshots.

## Release Notes

Raycast Store review uses npm, so keep `package-lock.json` committed for this package. Run `npm run build` before publishing.

`npm run lint` runs local ESLint and Prettier checks. Run `npm run lint:store` before publishing; it performs full Raycast metadata validation and currently requires the `author` value to match the real Raycast Store handle.

## Manual QA Notes

Use a non-production workspace or redact workspace data before creating screenshots. Never capture the raw API key.

Scenarios for #529:

- Valid Pro or Enterprise read key: command shows workspace name, workspace ID, base currency, plan tier, all critical limits, and links to workspace API key settings and Developer API docs.
- Blank key: Raycast required preferences should prompt first; if a blank value reaches the command, it shows an API-key-required state with an action to open extension preferences.
- Invalid or expired key: command shows an invalid-key state with actions to update extension preferences, open API key settings, and open Developer API docs.
- Free-plan blocked key: command shows a paid-plan-required state without raw key data and offers Billing, API key settings, and docs actions.
- Insufficient permissions: command explains that `workspaces.read` is required and links to API key settings/docs.
- Rate limiting: command asks the user to retry later and keeps the retry action available.
- Network failure or invalid local API Base URL: command points users to extension preferences and keeps production/local base URL support isolated to the `apiBaseUrl` preference.
