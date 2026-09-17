# Folio

Your portfolio in Raycast. Net worth, holdings, activities and idle cash from every brokerage you've connected through [SnapTrade](https://snaptrade.com). Keyboard-first, read-only, MIT.

Folio never places trades or moves money. SnapTrade OAuth apps are read-only by design, and the extension only ever sends `Authorization: Bearer <your token>` to SnapTrade.

## Commands

| Command | What it shows |
| --- | --- |
| Sign in with SnapTrade | Start or end a read-only SnapTrade session |
| Show Portfolio | Net worth per currency, accounts by institution, holdings per account |
| Show Positions | Every position across accounts, searchable, with weight and open P&L. Takes an optional ticker (`Show Positions AAPL`) |
| Show Activities | All · Trades · Dividends · Deposits for the last 365 days |
| Show Fog | Idle cash: "{N} days idle" and the undeployed amount |
| Connect Brokerage | Read-only SnapTrade Connection Portal and connection status |
| Menu Bar Portfolio | Net worth in the menu bar, per-account totals, Fog |

Everywhere: **⌘⇧P** hides balances (privacy mode), **⌘R** refreshes past the 60–120 s cache, **⌘I** toggles position details.

## Using Folio

1. Run **Sign in with SnapTrade**. Your browser opens SnapTrade's consent page; approve read access.
2. Run **Connect Brokerage** if you haven't linked a brokerage to SnapTrade yet. The Connection Portal opens in your browser and only asks for read-only access.
3. Run **Show Portfolio**.

Nothing to paste. You'll need a [SnapTrade account](https://dashboard.snaptrade.com/signup?personal=) with at least one brokerage connected; step 2 can set that up.

### Preferences

| Preference | Purpose |
| --- | --- |
| Auth Worker URL | Pre-filled. The small open-source worker that exchanges your sign-in code for tokens. |
| SnapTrade OAuth Client ID | Pre-filled. Public identifier of Folio's SnapTrade OAuth app. Not a secret. |
| Use bundled fixture data | Demo mode with invented Wealthsimple, Questrade and IBKR accounts. No network, no sign-in needed. |

## How Fog is computed

Fog is cash that isn't doing anything. The amount is the sum of cash balances across accounts (per currency). The idle days are counted from the later of your last buy and your last deposit within the activity window. If neither happened inside the window, Folio reports "365+" rather than guessing. It understates on purpose.

## Security notes

Folio is read-only and keeps your data on your Mac. Details:

- The extension never sends `clientId`, `consumerKey`, `userId`, `userSecret`, `timestamp` or a `Signature` header. Bearer only.
- Tokens are stored through `OAuth.PKCEClient.setTokens`. Sign out revokes the refresh token through the worker and then removes both tokens.
- On a 401 the extension refreshes once and retries once. If that fails it clears the session and asks you to sign in again.
- The `id_token` (if `openid` was granted) is only decoded locally to show your email on the sign-in screen. It is never sent anywhere.
- Portfolio data goes directly from Raycast to SnapTrade. The only server component, the open-source auth worker, sees your one-time sign-in code and tokens in transit and stores nothing.
- Responses are cached on disk by Raycast for fast reopening; sign-out clears that cache.

Source, threat model and how to report a problem: https://github.com/ShayanAbedi/folio
