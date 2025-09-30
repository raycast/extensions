# Crypto Search Raycast Extension

A Raycast extension for quickly searching crypto addresses and transactions across Solana and EVM chains.

## Features

- **Multi-chain Support**: Solana, Ethereum, BSC, and Base
- **Smart Detection**: 
  - Automatically detects if an address is a token or wallet
  - Routes to appropriate GMGN page (token vs address)
  - For EVM addresses, checks across multiple chains for token contracts
  - Falls back to checking native balance if not a token
- **Transaction Support**: Direct links to block explorers for transaction hashes
- **Configurable**: Choose between GMGN or block explorer as default target

## Usage

1. Open Raycast
2. Search for "Search Crypto Address"
3. Enter:
   - A Solana address (token or wallet)
   - An EVM address (Ethereum/BSC/Base)
   - A transaction hash

The extension will:
- For tokens: Open GMGN token page (e.g., `https://gmgn.ai/sol/token/...`)
- For wallets: Open GMGN address page (e.g., `https://gmgn.ai/sol/address/...`)
- For transactions: Open the appropriate block explorer

## Configuration

In Raycast preferences, you can set the default target:
- **GMGN** (default): Opens addresses on gmgn.ai
- **Block Explorer**: Opens addresses on chain-specific explorers (Solscan, Etherscan, etc.)

## Examples

### Solana Token
Input: `DAauoRhXGTdPEQZvimj81ahwMT54i4QsCXX6aR7fZDWr`
Output: Opens `https://gmgn.ai/sol/token/DAauoRhXGTdPEQZvimj81ahwMT54i4QsCXX6aR7fZDWr`

### EVM Token on Base
Input: `0x22af33fe49fd1fa80c7149773dde5890d3c76f3b`
Output: Opens `https://gmgn.ai/base/token/0x22af33fe49fd1fa80c7149773dde5890d3c76f3b`

### Transaction Hash
Input: `0x123...` or `abc123...` (64-66 chars)
Output: Opens appropriate block explorer transaction page