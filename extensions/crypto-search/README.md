# Crypto Search Raycast Extension

A powerful Raycast extension for instantly searching cryptocurrency addresses and transactions across multiple blockchain networks.

## Features

- **🚀 Multi-Chain Support**: Solana, Ethereum, BSC, and Base
- **⚡ Lightning Fast Detection**: 
  - Parallel transaction validation across all chains
  - Format-based Solana detection with base58 validation
  - Automatically detects if an address is a token or wallet
  - Routes to appropriate GMGN page (token vs address)
  - For EVM addresses, checks across multiple chains for token contracts
  - Falls back to checking native balance if not a token
- **🔍 Transaction Support**: 
  - Direct links to block explorers for transaction hashes
  - Supports both EVM (64 char) and Solana (87-88 char) transaction signatures
  - Automatic chain detection for EVM transactions
- **⚙️ Configurable**: Choose between GMGN or block explorer as default target
- **🛡️ Reliable**: Graceful fallbacks for network timeouts and errors

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

### Solana Transaction
Input: `2QpWtP1tDzyPcBQg6sVdfVmsZqKWGSTHZk4kPcD8bdbVNnyD3DjDxFP2ARNei1Li2n2TACW2N3WagYWACieJhkpa`
Output: Opens `https://solscan.io/tx/2QpWtP1tDzyPcBQg6sVdfVmsZqKWGSTHZk4kPcD8bdbVNnyD3DjDxFP2ARNei1Li2n2TACW2N3WagYWACieJhkpa`

### EVM Transaction
Input: `0x1f7b1ceab1b5b0ddfc488d0f505c51764d3ecaded9e6cfc9e2bfc820fa11c015`
Output: Opens appropriate block explorer (Etherscan/BSCscan/Basescan) based on automatic chain detection