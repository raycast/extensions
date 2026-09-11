# Wise Lens

Unofficial, community-built Raycast extension that gives you a clear overview of your [Wise](https://wise.com) account: how you're spending, your combined balance across currencies, and live exchange rates, instead of just listing raw account data. Not affiliated with or endorsed by Wise plc. "Wise" is a trademark of Wise plc, used here only to reference the service the extension reads from.

Three commands:

- **Wise Dashboard** — a summary of your account with balances by currency, an optional combined total converted into one currency, spending this month and over the last 30 days, and recent activity in a split detail view.
- **Wise Transactions** — browse and search your activity grouped by day, with filters for incoming, outgoing, completed and this month.
- **Wise Balance** — your balance and spending this month in the menu bar (macOS) or tray (Windows), refreshed every 10 minutes.

100% local. Read‑only. The extension never initiates transfers — it only reads.

## Setup

### 1. Create a Wise API token

1. Log in to [wise.com](https://wise.com).
2. Click your avatar (top‑right) → **Your account**.
3. Open **Connect and manage apps**.
4. Scroll to **Developer tools** and select **API tokens**.
5. Click **Create new token** and choose **Read only**. A `wise_pt_…` string is generated — copy it.

> Read‑only is enough for every endpoint Wise Lens uses (profile, balances, activities, rates). The extension cannot move money even if a full-access token is provided.

### 2. Paste the token in Raycast

Open any Wise Lens command. On first run Raycast prompts you for the token. It's stored in Raycast's local encrypted database, isolated to this extension. You can change it any time in **Raycast → Extensions → Wise Lens → Preferences**.

## Preferences

| Field                   | Default   | Description                                                                         |
| ----------------------- | --------- | ----------------------------------------------------------------------------------- |
| API Token               | —         | Required. Personal Read‑Only Token from Wise.                                       |
| Display Currency        | _(empty)_ | ISO 4217 (EUR, USD…). If set, shows an aggregated total converted to this currency. |
| Secondary Currency (FX) | _(empty)_ | Shows a secondary FX conversion (e.g. EUR → THB).                                   |
| Number Format           | `en-US`   | Thousands/decimal separators and symbol position for monetary amounts.              |
| Hide zero balances      | `true`    | Hides accounts and Jars with a zero balance.                                        |

## Endpoints used

All calls send `Authorization: Bearer <token>`:

- `GET /v2/profiles` — personal profile (cached for 24 h).
- `GET /v4/profiles/{id}/balances?types=STANDARD,SAVINGS` — balances + Jars.
- `GET /v1/profiles/{id}/activities?size=100` — activity.
- `GET /v1/rates?source=X&target=Y` — only when a display or secondary currency is configured.

## Privacy

- Your API token is stored in Raycast's local, encrypted preferences store and only readable by this extension.
- No data ever leaves your machine except the direct API calls to `api.wise.com`.
- The last successful snapshot is cached locally so the dashboard remains usable offline (shown with a ⚠ "cached" indicator).

## Rate limits

If Wise returns `429 Too Many Requests`, the extension enters a 5‑minute cooldown to avoid making things worse. During the cooldown the dashboard shows the cached snapshot.

## Community & Support

Found a bug, want to suggest a feature, or just chat with other users? Join the [community Discord](https://discord.gg/t6bwpWHrF7).

## Limitations

- Personal profile only (no BUSINESS profile in v1).
- Up to 100 most recent activities (no pagination yet).
- No write operations.
- SCA flow (RSA signing) is not implemented; Read‑Only tokens normally don't require it for the endpoints used here. If a request returns `403` with an `X-2FA-Approval` header, the extension surfaces a clear error.
