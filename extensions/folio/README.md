# Folio

Your portfolio in Raycast. Net worth, holdings, activities and idle cash from every brokerage you've connected through [SnapTrade](https://snaptrade.com). Keyboard-first, read-only, MIT.

Folio never places trades or moves money. SnapTrade OAuth apps are read-only by design, and the extension only ever sends `Authorization: Bearer <your token>` to SnapTrade.

## Commands

| Command | What it shows |
| --- | --- |
| Sign In with SnapTrade | Start or end a read-only SnapTrade session |
| Show Portfolio | Net worth per currency, accounts by institution, holdings per account |
| Show Positions | Every position across accounts, searchable, with weight and open P&L. Takes an optional ticker (`Show Positions AAPL`) |
| Show Activities | All · Trades · Dividends · Deposits for the last 365 days |
| Show Fog | Idle cash: "{N} days idle" and the undeployed amount |
| Connect Brokerage | Read-only SnapTrade Connection Portal and connection status |
| Menu Bar Portfolio | Net worth in the menu bar, per-account totals, Fog |

Everywhere: **⌘⇧P** hides balances (privacy mode), **⌘R** refreshes past the cache (90–120 s for balances, positions and account totals; 1 hour for activities and balance history, which SnapTrade only updates at its nightly sync), **⌘I** toggles position details.

## Using Folio

1. Run **Sign In with SnapTrade**. Your browser opens SnapTrade's consent page; approve read access.
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

Fog is cash that isn't doing anything. The amount is the sum of cash balances across accounts (per currency). The idle days are counted from the later of your last buy and your last deposit (or cash transferred in from another account) within the activity window. If neither happened inside the window, Folio reports "365+" rather than guessing. It understates on purpose.

## Security notes

Folio is read-only and keeps your data on your Mac. Details:

- The extension never sends `clientId`, `consumerKey`, `userId`, `userSecret`, `timestamp` or a `Signature` header. Bearer only.
- Tokens are stored through `OAuth.PKCEClient.setTokens`. Sign out revokes the refresh token through the worker (one retry) and then removes both tokens. If SnapTrade can't be reached, you're told the session was only removed locally.
- The session is refreshed a few minutes before it expires. On a 401 the extension refreshes once and retries once. If that still fails it asks you to sign in again. If the refresh itself fails because Folio's auth worker is briefly unreachable, the current token keeps being used until it actually expires. SnapTrade refresh tokens work only once, so when two Folio commands refresh at the same moment, the one that loses picks up the other's new tokens instead of signing you out.
- The `id_token` (if `openid` was granted) is only decoded locally to show your email on the sign-in screen. It is never sent anywhere.
- Sign-in goes through a small auth worker run by Folio's author (source: [`auth-worker/`](https://github.com/ShayanAbedi/folio/tree/main/auth-worker)). It exists only because SnapTrade OAuth apps need a client secret that can't ship inside an extension. It sees your one-time sign-in code and tokens in transit, stores nothing, and never sees portfolio data, which goes directly from Raycast to SnapTrade.
- Responses are cached on disk by Raycast for fast reopening, along with the last result each view showed (so it opens instantly) and the last holdings loaded for each account (so an account that fails to refresh can still be shown, marked with the time they're from). Sign-out clears all of these.

Source, threat model and how to report a problem: https://github.com/ShayanAbedi/folio
