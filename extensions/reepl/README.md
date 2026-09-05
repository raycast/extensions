# Reepl Raycast Extension

Run Reepl's public API from Raycast. The extension uses the same scoped API-key
authentication as the Zapier and Make.com integrations and keeps the supported
operation list in sync with the shared integration manifest.

## Features

- One command: `Run Reepl API Operation`
- All 24 supported operations from the shared manifest
- Draft, post, carousel, virality, and webhook operations
- Path parameters, query parameters, and JSON request bodies
- Response detail view plus clipboard copy
- macOS and Windows support

## Setup

```bash
cd reepl-raycast-extension
npm install
npm run dev
```

In Raycast preferences for the extension, set:

- `Reepl API Key`

The extension calls the production API at `https://api.reepl.io/v1`.

To create a key, open [Reepl API Keys](https://app.reepl.io/settings/api-keys),
choose the scopes needed by your operations, and copy the key into Raycast.

At minimum, include `user:read` to verify the connection. Add `drafts:read`,
`drafts:write`, `posts:read`, `posts:write`, `tools:use`,
`carousel:read`, `carousel:write`, or `webhooks:manage` for the corresponding
operations.

## Auth

- Header: `X-API-Key`
- Validation endpoint: `GET /external/me`

## Validate and publish

```bash
npm test
npm run lint
npm run build
npm run publish
```

`npm run publish` authenticates with Raycast and opens the Store submission
pull request. Raycast publishes the extension after review and merge.
