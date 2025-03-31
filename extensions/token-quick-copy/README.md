<img src="assets/logo.png" width="200" height="200" alt="Token Quick Copy Logo">

# Token Quick Copy - Raycast Extension

A Raycast extension for quickly searching and managing Ethereum ERC20 tokens across multiple blockchains using locally stored token lists.

## Features

- 🔍 Quick token search by symbol, name, or contract address
- ⭐️ Favorite token management
- 🔄 Automatic token list updates
- 🌐 Multi-chain support
- ⚡️ Fast local token list caching
- 🎯 Smart result prioritization (favorites and frequently used tokens)

## Installation

1. Install the extension from the Raycast Store
2. The extension will automatically download and cache token lists from the SmolDapp Token Lists repository

## Usage

1. Open Raycast
2. Type "Search Tokens" to launch the extension
3. Enter a token symbol, name, or contract address to search
4. Use the action panel to:
   - Copy token addresses to clipboard
   - Add/remove tokens from favorites
   - View token details

## Preferences

The extension stores the following preferences locally:

- Favorite tokens list
- Enabled blockchain networks
- Active token lists
- Token list refresh interval (daily/weekly)

## Data Source

Token lists are sourced from the [SmolDapp Token Lists Repository](https://github.com/SmolDapp/tokenLists/tree/main/lists/), which provides curated token lists for various blockchain networks.

## Development

### Prerequisites

- Node.js 16 or later
- Raycast
- TypeScript

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development:
   ```bash
   npm run dev
   ```

### Building

```bash
npm run build
```

## License

MIT
