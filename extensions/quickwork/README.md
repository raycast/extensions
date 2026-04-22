# QuickWork

![QuickWork Icon](./assets/icon.png)

QuickWork is a Raycast extension for sending Feishu group messages as a **real user identity** (not bot identity), with OAuth authorization and automatic token refresh.

## Why QuickWork

- Fast daily updates directly from Raycast
- Structured message format: `Category：Message`
- Split input UI: `Message` + `Category`
- `Category` is auto-filled from the last successful input
- OAuth callback is captured locally (`localhost` / `127.0.0.1`)
- One-time retry on Feishu permission error `99991679` after forced refresh

## Commands

### `Quick Send`
Open a compose form and send a message to the configured Feishu group.

- `Message`: multiline content
- `Category`: independent field, cached for next launch
- Final message format: `Category：Message`
- Search keywords include: `qw`, `send`, `feishu`, `lark`

Examples:

- Category: `Daily Update`
- Message: `Completed API integration and validated in staging.`

### `Authorize Feishu`
Open the Feishu OAuth page, capture the callback code on localhost, exchange tokens, and store auth state locally.

## Quick Start

### 1) Prerequisites

- Raycast installed
- A Feishu Open Platform app
- Your target group chat ID (`oc_xxx`)

### 2) Configure Feishu app

Set OAuth redirect URI in Feishu app settings, for example:

`http://127.0.0.1:14520/feishu-callback`

Recommended user scopes:

- `offline_access`
- `im:chat:read`
- `im:message`

### 3) Configure extension preferences in Raycast

- `Feishu App ID`
- `Feishu App Secret`
- `Feishu User Refresh Token`
- `Feishu OAuth Redirect URI`
- `Feishu Chat ID`

### 4) Authorize once

Run `Authorize Feishu` and complete the browser flow.

### 5) Send messages

Run `Quick Send`, fill `Message` and `Category`, then submit.

> [!NOTE]
> If `Category` is empty when submitting, QuickWork will fallback to the last cached category.  
> If there is no cached value yet, sending will fail with a clear error.

## Token Behavior

- Uses cached `access_token` when it is still valid
- Refreshes token with `refresh_token` before expiration
- If send fails with Feishu code `99991679`, forces one refresh and retries once
- Stores latest auth state in Raycast local storage

## Data Handling & Privacy

- Stored locally in Raycast LocalStorage:
  - Feishu auth state (`access_token`, `refresh_token`, `expiresAt`)
  - Last used message category
- Sent to Feishu API:
  - OAuth exchange and refresh requests
  - Group message payload (`chat_id`, message text)
- QuickWork does not send analytics telemetry to third-party tracking services.

## Local Development

```bash
npm install
npm run dev
```

Validation commands:

```bash
npm run lint
npm test
npm run build
```

## Project Structure

```text
src/
  authorize-feishu.ts      # OAuth launch + localhost callback capture
  send-feishu-message.tsx  # Compose form + send flow
  lib/
    feishu.ts              # Feishu API calls and response validation
    auth-state.ts          # Local token persistence
tests/
  feishu.test.ts
```

## Troubleshooting

### Authorization failed: Invalid OAuth state

- Close stale authorization tabs
- Re-run `Authorize Feishu` and finish that exact opened page

### Timed out waiting for authorization callback

- Ensure redirect URI host is `localhost` or `127.0.0.1`
- Ensure redirect URI includes explicit port and callback path
- Ensure the same redirect URI is configured in both Feishu app and Raycast preferences

### Feishu error `99991679`

- Confirm the required scopes are enabled and published
- Re-authorize after any scope change

## Security

- Treat `app_secret`, `access_token`, and `refresh_token` as sensitive
- Do not commit secrets or paste them into logs/screenshots
- Rotate credentials immediately if exposure is suspected
