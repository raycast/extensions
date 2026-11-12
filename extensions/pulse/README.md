# Pulse for Raycast

Look up any stock, ETF, index or crypto pair from Raycast, by ticker or by its
name in English, 简体中文, 繁體中文, 日本語 or 한국어, and see its price, change
and today's chart.

- **Six stock markets**: United States, Hong Kong, China A-shares (Shanghai and
  Shenzhen), Japan, Korea (KOSPI and KOSDAQ) and Taiwan (TWSE and TPEx), plus
  the major indices and every Binance Spot pair.
- **Search in your language**: `腾讯`, `騰訊`, `テンセント` and `0700` all find
  Tencent; `台积电` finds 台積電; `삼성` finds Samsung Electronics. Names are
  shown in the script you type, or in the language you pick in the preferences.
- **Today's chart** in the detail pane, against the previous close, with open,
  high, low and the market's session. Press `⌘D` to hide the chart and see
  prices and changes in the list instead.
- **Filter by market** from the dropdown, and find recent symbols when the
  search bar is empty.
- **Favorites**: press `⌘⇧P` on any symbol to pin it. Favorites lead the list
  when the search bar is empty; reorder them with `⌘⌥↑` and `⌘⌥↓`.
- **Favorites in Menu Bar**: your favorites' prices and changes in the menu
  bar, refreshed every five minutes. The first favorite leads the menu bar
  title; choose what it shows in the command's preferences.
- **AI**: ask `@pulse` things like "how is 台積電 doing today?", "how are my
  favorites doing?" or "add Bitcoin and Tencent to my favorites". Pulse finds
  the symbols, prices them, and asks before changing your favorites.

Typing a ticker the list does not know, like `^FTSE` or `EURUSD=X`, looks it up
on Yahoo Finance directly; a pair like `ETH/BTC` is priced on Binance.

## Data and privacy

- Symbol search runs on your Mac over Pulse's symbol list
  (`www.pulseticker.app/catalog/symbols-v1.json`, about 1 MB compressed),
  downloaded once and checked for updates at most once a day.
- Stock and index prices come from Yahoo Finance
  (`query1.finance.yahoo.com`); crypto from Binance's public market data
  (`data-api.binance.vision`), which also lists the pairs that are trading.
- Stock quotes follow each exchange's delay; crypto is real time. When the
  delay is unknown the extension says so.
- Favorites are kept in Raycast's local storage on your Mac.
- No account, no API key, and nothing about your searches leaves your Mac
  except the quote requests themselves. With `@pulse`, Raycast AI sees what
  you ask and what the tools return, including your favorites.

## Pulse for Mac

Want these prices in your menu bar all day, with watchlists, charts and
positions? See [Pulse for Mac](https://www.pulseticker.app/?utm_source=raycast&utm_medium=extension&utm_content=readme).
