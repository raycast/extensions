# wlthy for Raycast

See your net worth, today's and this month's change, and your allocation —
straight from Raycast, without opening a browser. Read-only.

## Commands

- **Net Worth** — total net worth with the day / month change and your asset
  and debt totals.
- **Allocation** — break your wealth down by asset class, currency,
  geography or sector.
- **By Country** — net worth per country, with leverage (assets vs debt)
  shown for each — wlthy's multi-country view.
- **Assets** — search every holding, sorted by value.
- **Debts** — see what you owe, sorted by balance.
- **Net Worth in Menu Bar** — keep the total glanceable in the macOS menu
  bar; refreshes hourly.

## Setup

1. In wlthy, go to **Settings → API & MCP** and create a **read-only REST
   key** (starts with `wlthy_rest_`).
2. Open any wlthy command in Raycast and paste the key when asked (or in the
   extension preferences, ⌘ ,).

That's it. The key is **read-only by design** — this extension can only read
your ledger. It cannot move money, create an asset, or change a setting.
Revoke the key any time in wlthy Settings and the extension stops working on
the next refresh.

## Notes

- Figures are shown in USD (the wlthy REST API reports in USD).
- For a white-label or self-hosted wlthy instance, set the **wlthy URL** in
  preferences; otherwise leave it as `https://wlthy.io`.

## Privacy

The extension talks only to your own wlthy account over HTTPS, using the key
you paste. Nothing is sent anywhere else. Requires a wlthy account.
