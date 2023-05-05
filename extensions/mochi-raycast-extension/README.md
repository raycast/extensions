# Mochi Raycast Extension

## About

This project is a Raycast extension that allows users to query token and NFT data using Mochi APIs. Users can query token price, market cap, movement, and also convert tokens. They can also query NFT rarity, ranking, and sales.

## Technologies Used

This project uses Mochi APIs to query token and NFT data. It also uses Raycast’s built-in extension bootstrapping tool to make the evaluation process easier. The following technologies were used to develop this project:

### Tools

- Node.js
- TypeScript
- Axios

### APIs

- `https://api.mochi.pod.town/api/v1/defi/coins?query=${coin}`: search token/coin by name.
- `https://api.mochi.pod.town/api/v1/defi/coins/${coin}`: get token/coin detail.
- `https://api.mochi.pod.town/api/v1/nfts/:symbol_or_address/:id?query_address=`: search NFT Collection by name.
- `https://api.mochi.pod.town/api/v1/nfts/collections/tickers?collection_address=$address&from=$from&to=$to`: get NFT Collection detail.
- `https://api.mochi.pod.town/api/v1/config-defi/tokens`: get token list.
- `https://api.indexer.console.so/api/v1/token/convert-price`: Convert token prices.

## Usage

To use this extension, follow these steps:

1. Install Raycast on your device.
2. Clone this repository to your local machine.
3. Open the repository in your preferred code editor.
4. Run `npm install` to install all dependencies.
5. Run `npm run dev` to start development server.
6. Open Raycast, type `"mochi"` followed by the desired command to start using the extension.

## Commands

This extension supports the following commands:

1. `Token Ticker` - Query token price, market cap, and movement.
2. `NFT Ticker` - Query NFT Collection information.
3. `Crypto Conversion` - calculate the equivalent value of a token when converting from another token

Sub-actions:

- `Open in CoinMarketCap`
- `Add to favorite` / `Remove from favorite`

## Team Members

[Khac Vy](https://github.com/trankhacvy)

## Demo

Check out the demo video to see the extension in action.
https://www.loom.com/share/e0816eef32fc4972b4c6217b9d66959f

## Use Cases

Here are some suggested use cases for this extension:

- A cryptocurrency trader can use this extension to query token data and make informed investment decisions.
- A user who wants to convert tokens can use this extension to easily convert them without having to leave the Raycast app.
- An NFT collector can use this extension to keep track of the rarity and ranking of their NFTs.
