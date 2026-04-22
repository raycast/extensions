# CryptoWallet

Track simulated crypto portfolios in Raycast with live CoinMarketCap prices, local transactions, charts, reports, menu bar value, and AI-powered portfolio questions.

CryptoWallet lets you create multiple local wallets, add buy/sell/transfer transactions, review holdings, inspect portfolio and asset charts, generate Markdown reports, backup your data, and keep a selected wallet value in the menu bar.

## Store Description

CryptoWallet brings a CoinMarketCap-style portfolio tracker to Raycast. Create local simulated wallets, add crypto transactions, monitor live values and profit/loss, inspect charts, export reports, and ask Raycast AI questions about your portfolio.

## Highlights

- Track multiple local crypto wallets with emoji labels and pinned ordering.
- Add buy, sell, transfer in, and transfer out transactions.
- Fetch live prices and 24h/7d changes from CoinMarketCap.
- View current value, average cost, realized P/L, unrealized P/L, total P/L, allocation, and transaction history.
- Inspect portfolio and asset charts, including allocation and transaction-flow views.
- Show all wallets or one selected wallet in the menu bar, refreshed every 5 minutes.
- Copy Markdown reports and JSON backups for export/import.
- Ask `@CryptoWallet` free-form questions with Raycast AI.

## Setup

CryptoWallet requires a CoinMarketCap Developer API key.

1. Create a CoinMarketCap Developer account.
2. Copy your API key.
3. Open Raycast preferences for CryptoWallet.
4. Paste the key into `CoinMarketCap API Key`.
5. Choose your preferred display currency.

Your API key is stored in Raycast preferences and used locally to fetch prices from CoinMarketCap.

## Commands

- `CryptoWallet`: manage wallets, holdings, charts, reports, backup, and import.
- `Add Transaction`: quickly add a buy, sell, transfer in, or transfer out transaction.
- `Search Asset`: search CoinMarketCap assets by name, symbol, or slug.
- `Portfolio Snapshot`: view a compact read-only overview of all wallets.
- `Daily Report`: copy a Markdown report to the clipboard.
- `Portfolio Value`: show portfolio value in the menu bar, refreshed every 5 minutes.

## AI

CryptoWallet includes an `Ask AI` tool for Raycast AI. Use `@CryptoWallet` to ask questions about your portfolios, holdings, performance, or recent transactions.

The AI tool is read-only. It can inspect portfolio data but cannot modify wallets or transactions.

## Data and Privacy

- Portfolio data and transactions are stored locally using Raycast LocalStorage.
- Live prices are fetched from CoinMarketCap using your API key.
- Charts are rendered with QuickChart image URLs from aggregated portfolio values.
- Backup and Markdown reports are copied to your clipboard only when you trigger those actions.

CryptoWallet is for portfolio tracking and simulation only. It is not financial advice.

## Development

```bash
npm install
npm run dev
```

Before publishing, verify the extension with:

```bash
npm run lint
npm run build
```
