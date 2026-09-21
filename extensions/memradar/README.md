# MemRadar

Search RAM and SSD prices, with the price history behind them, from [MemRadar](https://memradar.com).

## Commands

### Search Memory Prices

Search tracked RAM and SSD products by name, brand or ASIN. Each row shows the current price and whether it is a good time to buy, measured against that product's own 90-day average.

Press Enter on a product for its price history: the all-time low and high with the dates they were set, the 90-day average, how long it has been tracked, and the monthly prices. Products tracked for years show their recent months in full and then one line per earlier year, with that year's low, high and closing price. Months with no recorded price are omitted rather than filled in.

Cmd+Enter opens the product on memradar.com. Cmd+D toggles a compact side pane in the list. The product list is downloaded once per session and searched locally, so typing makes no network requests.

### Show Market Overview

How each segment has moved: DDR5, DDR4, NVMe and SATA, each with its median price, its median price per gigabyte, and the change over one month, three months, six months and a year.

Every change states how many products it was measured across, because each window compares only the products tracked at both of its ends. Figures across a segment are medians rather than averages, and the periods are not directly comparable with each other.

## About the data

MemRadar tracks consumer RAM and SSD prices at US retail.

- **Updated once a day.** memradar.com refreshes prices six times a day; these files are written once, so figures here can be up to 24 hours behind the site. Every view shows the date its data was computed, and warns when that date is more than three days old. This is not a live feed.
- **Prices are what a buyer pays at retail in the United States.** They are not contract or spot prices.
- **Price history is sourced from Keepa** (keepa.com) under license, and is published at one point per month with Keepa's written permission. Figures are computed by MemRadar from that history. The data is provided for use with this extension and does not carry a right to redistribute the price history.

The extension reads two files and nothing else:

- `https://memradar.com/data/raycast-v1-market.json`
- `https://memradar.com/data/raycast-v1-products.json`

It never requests finer-grained history than one point per month. `npm run preflight` checks that before every publish and fails the publish if it is not true.

## Development

```
npm install
npm run dev        # opens the extension in Raycast
npm run lint
npm run preflight  # attribution and licensing checks, run against the live files
```

Built against `@raycast/api` 1.x, macOS only.

## Maintaining

**This repository is the canonical source for the extension.** The pull request against `raycast/extensions` is served from a fork branch, `malcolm15/raycast-extensions` on `ext/memradar`, with the extension under `extensions/memradar/`. That branch is a **mirror**. Never edit it directly: a change made there exists nowhere else, and the next mirror overwrites it.

To update the pull request, either:

- run `npm run publish` from a real terminal, which needs a TTY for the GitHub device-code prompt and will not work from a non-interactive shell, or
- copy the changed files from here into the fork branch and push:

```
git clone --depth 1 --branch ext/memradar https://github.com/malcolm15/raycast-extensions.git
cp <changed files> raycast-extensions/extensions/memradar/...
cd raycast-extensions && git commit -am "..." && git push origin ext/memradar
```

**After any update, confirm the two trees still match:**

```
node scripts/check-fork-sync.mjs
```

It compares git blob hashes for every committed file against the fork branch, so a match is proof of identical bytes. Exit 0 means identical, 1 means drift (it names the files and which side they are on), and 2 means it could not tell, which is deliberately not the same as a pass. `scripts/check-fork-sync.mjs` itself is listed as local-only and is not mirrored, since the published folder should carry as little non-runtime code as possible.

## License

MIT for the extension's own code. The data remains subject to MemRadar's and Keepa's terms.
