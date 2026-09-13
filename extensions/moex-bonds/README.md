# MOEX Bonds

Search Russian bonds on the [Moscow Exchange](https://www.moex.com/) by name, ticker, issuer or
ISIN and read the full bond card. Data comes from the public
[MOEX ISS API](https://iss.moex.com/iss/reference/) — no API key, no account, no setup.

The bond card is written in Russian: the extension covers a Russian-only market and the
terminology (НКД, оферта, амортизация) has no natural English equivalent traders use.

## Features

- **Live search.** Type `сегежа`, `26238`, `РЖД 1Р` or `RU000A10CB66` — the list narrows as you
  type. Only issues currently traded are shown.
- **Bond card.** Price as a percentage of face value with the source it came from, yield to
  maturity and to offer, duration, accrued interest, coupon rate and amount, payment frequency,
  the next five coupons, maturity date, put/call offer, amortization schedule, face value with
  its currency, amount outstanding, listing level and issue type.
- **Favorites.** `⌘⇧F` adds a bond; with an empty search field the list shows your favorites
  with live quotes.
- **Actions.** `⌘R` refresh, `⌘⇧C` copy ISIN, copy the card as plain text, open the issue on
  MOEX or Smart-Lab.

## Development

```bash
npm install
npm run build   # installs the extension into Raycast
npm run dev     # same plus hot reload
npm test        # tests for the ISS client
```

`npx eslint src test` lints the source.

## Notes on the MOEX ISS API

A few behaviours of the API are easy to get wrong and silently produce believable but incorrect
numbers. They are handled explicitly:

1. **One bond trades on several boards.** The replacement bond `RU000A105RH2` is quoted on
   `TQCB` (settled in roubles, where the trades happen) and on `TQOD` (settled in currency,
   where `LAST` is empty). Taking the first row of the response shows the wrong price. Board
   selection lives in a single place: `selectMarketRow`.
2. **Zero means "no data".** `YIELD`, `DURATION` and `COUPONVALUE` come back as zeros overnight,
   on weekends and for floaters whose next rate has not been announced. Printing `0 %` would be
   a lie, so those render as an em dash.
3. **Price follows a fixed priority:** `LAST` → `MARKETPRICE` → `PREVPRICE` → closing price from
   history, and the card always states which one is on screen.
4. **The face value is not always in roubles.** Replacement bonds use `FACEUNIT = USD`, some
   issues use `CNY`.
5. **Amortized bonds shrink.** `RU000A108777` is already down to ₽800 from ₽1000 at issue, and
   the percentage price refers to the current face value.
6. **Search returns matured issues** — they are filtered out by `is_traded`.

## Project layout

| File | Purpose |
|---|---|
| `src/moex.ts` | ISS client: search, batched quotes, bond card, coupons, history fallback |
| `src/card.ts` | Card text builders (markdown and clipboard) — pure functions, covered by tests |
| `src/format.ts` | Numbers, dates, currencies, Russian plurals |
| `src/search-bond.tsx` | Live search list |
| `src/bond-detail.tsx` | Bond card |
| `src/favorites.ts` | Favorites in LocalStorage |
| `scripts/make-icon.py` | Icon generator, no dependencies |
