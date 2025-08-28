# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build extension**: `npm run build` - Uses `ray build -e dist --skip-types`
- **Development**: `npm run dev` - Run extension in development mode with `ray develop`
- **Lint**: `npm run lint` - Check code quality with `ray lint`
- **Fix linting**: `npm run fix-lint` - Auto-fix linting issues with `ray lint --fix`
- **Publish to Raycast**: `npm run publish` - Publish extension to Raycast Store

## Architecture Overview

This is a Raycast extension for cryptocurrency address and transaction searching across multiple blockchain networks.

### Core Components

**Main Command** (`src/search.tsx`):
- Single form-based command that accepts addresses/transaction hashes
- Handles Solana addresses, EVM addresses (Ethereum/BSC/Base), and transaction hashes
- Routes to either GMGN or block explorers based on user preference
- Includes optional maker address filtering for GMGN URLs

**Blockchain Utils** (`src/utils/blockchain.ts`):
- Address validation for Solana (using @solana/web3.js) and EVM chains (using ethers.js)
- Smart token detection: checks if address is a token contract vs regular wallet
- Multi-provider failover system for reliability across RPC endpoints
- Async checks for EVM token contracts using ERC20 ABI calls
- Transaction hash detection and chain routing

**URL Generation** (`src/utils/urls.ts`):
- Builds GMGN URLs: `https://gmgn.ai/{chain}/{type}/{address}?maker={optional}`
- Builds explorer URLs for Solscan, Etherscan, BSCscan, Basescan
- Chain mapping for URL prefixes

### Chain Support

- **Solana**: Token detection via program ownership check (Token Program/Token-2022)
- **Ethereum**: Token detection via contract code + ERC20 interface validation
- **BSC**: Same EVM approach as Ethereum
- **Base**: Same EVM approach as Ethereum

### Key Logic Flow

1. Input validation (address format vs transaction hash)
2. For Solana: Check if address is token via account info
3. For EVM: Check if address is token contract across all chains, fallback to nonce check for active addresses
4. Route to appropriate URL based on detection results and user preference

### Configuration

Extension preferences (configurable in Raycast):
- `defaultTarget`: Choose between "gmgn" (default) or "explorer" as the target platform

### Dependencies

- `@raycast/api`: Core Raycast extension API
- `@solana/web3.js`: Solana blockchain interaction
- `ethers`: Ethereum and EVM chain interaction
- React type overrides to fix build conflicts