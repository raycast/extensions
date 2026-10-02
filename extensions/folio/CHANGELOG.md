# Folio Changelog

## [Reliability Fixes] - 2026-10-02

- Fixed being signed out for no reason when two Folio commands refreshed the SnapTrade session at the same moment (for example the Menu Bar in the background and a command you opened)
- The session now refreshes a few minutes before it expires, so requests don't straddle the expiry
- An account whose holdings fail to refresh keeps its last loaded holdings, marked with the time they're from, instead of disappearing from the Menu Bar and its net worth
- The Menu Bar lists accounts that couldn't be loaded at all, instead of leaving them out silently
- "Updated" time in the Menu Bar and Show Portfolio, and a note when a refresh failed and older data is shown
- At most two balance and position requests at a time per brokerage connection, so brokerages are less likely to rate-limit Folio
- Fewer requests: identical requests that run at the same time are sent once, and activities and balance history (which SnapTrade only updates at its nightly sync) are cached for an hour. ⌘R still fetches everything fresh
- A clear message when SnapTrade's per-account rate limit is reached, with when to try again
- Accounts whose data SnapTrade hasn't updated recently (for example Wealthsimple) show how old it is: "data from …"
- The day change only adds up accounts whose balance snapshots cover the same dates, shows those dates, and stays out of the Menu Bar title when it isn't recent
- Internal cash transfers between accounts now show under Deposits and count as new cash in Fog
- ⌘R inside an account's holdings now updates the holdings shown and the portfolio list behind it
- ⌘R pressed again while a refresh is running joins it instead of starting another
- A SnapTrade request that gets no answer within 60 seconds now fails instead of leaving Folio loading (once per brokerage, not once per account); the account falls back to its last loaded holdings if it has any, and otherwise is listed as couldn't load
- If Folio's sign-in service is briefly unreachable or slow, Folio keeps using your current session instead of asking you to sign in or waiting on it
- When your session has ended, the Menu Bar and Show Portfolio say so and offer Sign In instead of only showing older numbers
- Sign-out also clears the portfolio Folio keeps for opening views instantly
- The menu bar icon turns into a warning when the net worth shown is out of date or leaves accounts out, and accounts SnapTrade reports no balance for are counted as left out instead of silently dropped

## [Initial Version] - 2026-09-29

- Sign In with SnapTrade (OAuth, PKCE, read-only) with token refresh and revoke through the Folio auth worker
- Show Portfolio: net worth per currency, accounts grouped by institution, holdings per account
- Show Positions: every position across accounts in one searchable list with weights and open P&L; optional ticker argument jumps straight to a holding
- Show Activities: All / Trades / Dividends / Deposits across accounts
- Show Fog: idle cash and how long it has been sitting, computed from activities
- Connect Brokerage: read-only SnapTrade Connection Portal and connection status
- Menu Bar Portfolio: net worth (and day change when SnapTrade reports balance history) with masked privacy mode
- Privacy mode (⌘⇧P) that hides every balance
- Bundled Wealthsimple / Questrade / IBKR fixtures for demos and screenshots
