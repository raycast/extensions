# CoinMarketCap Crypto Crawler Changelog

## [Update metadata] - 2025-01-19

- add README.md to let user easily understand the extension.
- add screenshots in `metadata` folder.

## [Improve User Experience] - 2025-01-19

- fix the crawler issue caused by page structure change.
- add a separated watchlist page to keep track of your favorite coins.
- remove the original `favorite` section in the search result.
- change the shortcut of add to watchlist to be `cmd + w`
- use bignumber.js to handle the price calculation in the currency converter.
- add colored tag with the price direction for each coin in the watchlist and search result.

## [Improve error handling ] - 2022-02-03

- Improve error handling flow to prevent crash when fetching data from CoinMarketCap.

## [Improve CoinMarketCap extensions ] - 2021-12-23

- Add favorite command and change output style for coinmarketcap extension
- Add currency converter for calculating value in USD & in selected crypto currency

## [Update cache mechanism] - 2021-11-10

- make sure that icon image format is png.
- change the day to update cached file to be 15 days because crypto market changes very fast.

## [First Release] - 2021-10-26

- initial release
