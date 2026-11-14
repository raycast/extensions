# Trading 212

View your Trading 212 portfolio, position charts and account history in Raycast. The extension is read-only: it cannot place, change or cancel orders.

## Commands

### Portfolio

A list of your positions with a detail pane on the right.

- The top row shows your total balance, the return on your current holdings, and a portfolio map where tile size is position value and color is total return.
- Each position shows a price chart with your average buy price, today's change, value, return, shares, share of portfolio and the date you first held it.
- Choose a chart range (1D, 1W, 1M, 1Y, 5Y) from the search bar dropdown.
- Actions: open the instrument on Yahoo Finance, open Trading 212, copy the ticker, refresh.

### Portfolio Menu Bar

Shows your portfolio value and today's change in the menu bar, refreshed every 10 minutes. The menu lists today's change, the return on current holdings and the top movers of the day. You can hide the amount in the extension preferences and show only the percentage; the balance then appears in the menu instead.

### History

Switch between three views from the search bar dropdown. Items are grouped by month, newest first.

- Dividends: totals for the last 12 months, a monthly bar chart, and each payout.
- Orders: past buys and sells with status, fill price, total and fees.
- Deposits & withdrawals: net amount deposited, a chart of money put in per month with the monthly average, and each transaction. Interest on cash appears as one row per month and isn't counted as money you put in.

## Setup

1. In Trading 212, go to Settings → API and create an API key.
2. Turn on only the view permissions: Account data (`account`), Portfolio (`portfolio`) and History (`history:dividends`, `history:orders`, `history:transactions`).
3. Leave every other permission off, especially order and pie permissions (`orders:execute`, `pies:write`). The extension only reads data and never needs them.
4. Copy the API key and secret into the extension preferences in Raycast. Trading 212 shows the secret only once.
5. Choose Live or Demo as the environment, matching the account the key was created in (Practice mode keys use Demo).

## Privacy

- Your API key and secret are stored in Raycast preferences and sent only to Trading 212 (`live.trading212.com` or `demo.trading212.com`).
- The extension only makes `GET` requests to Trading 212. It has no code path that writes to your account.
- Yahoo Finance is used for price charts and today's change. Yahoo Finance sees which instruments are looked up (ISINs/symbols), never quantities, amounts or account data.
- The extension sends no other data to third parties — no analytics, no chart services.
- Fetched data is cached locally so commands open instantly.

## Limitations

- The Trading 212 API is in beta and may change.
- Only Invest and Stocks ISA accounts are supported. CFD and SIPP accounts are not.
- Amounts are shown in your account's primary currency.
- Yahoo Finance data is unofficial. Prices may be delayed or missing for some instruments, in which case charts and today's figures are left out while everything from Trading 212 still works.
- Trading 212 enforces strict rate limits on history endpoints, so the first load of History can take a minute. Later opens use cached data.
- Trading 212 has no watchlist API, and the extension does not support Pies.
