# Multichain Explorer - Release Notes

## Version 2.0 - Major Feature Release

### 🎉 What's New

#### 1. Comprehensive Explorer Configuration System
Transform your blockchain explorer experience with fully customizable configurations!

**Key Features:**
- ✅ **Custom Path Configuration**: Define URL paths for any blockchain explorer
  - Example: Solana uses `/account/` instead of `/address/`
  - Configurable paths for transactions, addresses, blocks, tokens, signatures, and ENS

- ✅ **Pattern Matching System**: Support for non-EVM chains with custom regex patterns
  - Solana: Base58 address and signature matching
  - Bitcoin: Multiple address format support (Legacy, P2SH, Bech32)
  - Cardano, Sui, Aptos, and 15+ other blockchains pre-configured

- ✅ **Configuration UI**: Easy-to-use form for customizing any explorer
  - Press `⌘ + E` on any explorer to configure
  - Visual indicators for configured explorers
  - Reset to defaults option

- ✅ **Pre-Configured Explorers**: 20+ blockchains work out of the box
  - Solana (Solscan, Solana Explorer)
  - Bitcoin (Blockchain.com, Blockchair)
  - Cardano, Sui, Aptos, Tron, Near, Algorand, Stellar, Polkadot, XRP, Cosmos, and more

#### 2. Quick Actions & Address Details
Power user features for working with blockchain data!

**Quick Actions Menu:**
- 📋 **Multiple Copy Formats**:
  - Checksummed (EIP-55) for error prevention
  - Lowercase for API compatibility
  - With/without 0x prefix for different platforms
  - Payment URI for wallet apps

- 📱 **QR Code Generation**: Instant QR codes for mobile wallets
- 🔗 **Payment URI**: `ethereum:0x...` format for wallet apps
- 📤 **Formatted Sharing**: Copy nicely formatted details for sharing

**Address Details View (`⌘ + D`):**
- Large QR code for easy scanning
- All address format variations
- Checksum validation indicator
- Chain information and metadata
- Educational tips about address formats
- Quick copy actions for all formats

#### 3. Enhanced Search Experience

**Signature Matching:**
- New `SignatureMatch` class for Solana and similar chains
- Automatic detection of base58 signatures
- Proper routing to signature explorers

**Improved Actions:**
- Organized action panels with sections
- Context-aware shortcuts
- Address-specific tools
- Better keyboard navigation

#### 4. Chain Support Expansion

**New Built-in Chains:**
- Solana (Mainnet & Devnet)
- Bitcoin
- Plus all viem chains with deduplication

**Fixed Issues:**
- Resolved duplicate chainId warnings
- Improved chain filtering
- Better icon handling

### 📚 Documentation

**New Comprehensive Guides:**
- `USER_GUIDE.md`: 400+ lines covering all features
  - Installation and setup
  - Basic and advanced usage
  - Custom configuration guide
  - Keyboard shortcuts reference
  - Tips, tricks, and troubleshooting

- `IMPLEMENTATION.md`: Technical deep dive
  - Architecture overview
  - Component documentation
  - Data flow diagrams
  - Extension guide
  - Testing strategies

### 🎮 Keyboard Shortcuts (Updated)

| Shortcut | Action |
|----------|--------|
| `⌘ + C` | Copy value |
| `⌘ + ⇧ + C` | Copy explorer URL |
| `⌘ + D` | View address details (addresses only) |
| `⌘ + Q` | Copy payment URI (addresses only) |
| `⌘ + ⇧ + S` | Copy formatted for sharing |
| `⌘ + E` | Configure explorer (in list view) |

### 🛠️ Technical Improvements

**New Utilities (`src/utils/blockchain-utils.ts`):**
- `toChecksumAddress()`: EIP-55 checksumming
- `getAddressVariations()`: Format conversion
- `validateAddress()`: Chain-specific validation
- `generateQRCode()`: SVG QR code generation
- `shortenAddress()`: Display formatting
- Currency conversion helpers (Wei/Lamports/Satoshis)

**New Components:**
- `ConfigureExplorer`: Full-featured configuration form
- `AddressDetail`: Rich address information view

**Enhanced Interfaces:**
- `ExplorerConfig`: Path and pattern configuration
- `PathConfig`: URL path definitions
- `PatternConfig`: Regex pattern matching
- `MatchType`: Extended type system

**Architecture:**
- Configuration priority system (User > Pre-defined > Default)
- LocalStorage-based persistence
- Lazy loading of configurations
- Graceful error handling

### 🎯 Use Cases

**For Developers:**
```
1. Search Ethereum address
2. Press ⌘ + D to view details
3. Copy checksummed version for smart contract
4. Prevents typos and errors!
```

**For Traders:**
```
1. Highlight Solana transaction signature
2. Press your hotkey
3. Automatically switches to Solana + Solscan
4. Open transaction details instantly
```

**For Multi-Chain Users:**
```
1. Configure custom explorer for your favorite chain
2. Define URL paths and patterns
3. Full support for any blockchain explorer
4. Search works seamlessly
```

### 📊 Stats

- **Lines of Code**: 2000+ added
- **New Files**: 8
- **Documentation**: 1000+ lines
- **Supported Chains**: 200+ (with custom config)
- **Pre-Configured**: 20+ non-EVM chains
- **Actions per Result**: 10-15 quick actions

### 🔧 Installation

```bash
cd multichain-explorer
npm install
npm run build
```

Then import in Raycast:
1. Raycast → Extensions → Import Extension
2. Select the `multichain-explorer` directory
3. Set your preferred hotkey
4. Start searching!

### 📖 Getting Started

1. **Basic Search**: Highlight any blockchain address/hash → Press hotkey
2. **Configure Explorer**: List Explorers → `⌘ + E` on any chain
3. **View Details**: Search address → `⌘ + D` for rich info
4. **Copy Formats**: Use quick actions menu for different formats

### 🐛 Bug Fixes

- Fixed duplicate chainId warnings from viem
- Improved explorer URL construction
- Better error handling for invalid configurations
- Fixed checksum validation edge cases

### ⚡ Performance

- Debounced Routescan API calls (300ms)
- LocalStorage caching for configurations
- Lazy loading of custom configs
- Optimized pattern matching

### 🙏 Credits

Built with:
- [Raycast API](https://developers.raycast.com/)
- [Viem](https://viem.sh/) for chain definitions
- [Routescan API](https://routescan.io/) for multi-chain detection
- Love for the blockchain community ❤️

### 🔮 What's Next

**Planned Features:**
- Address book for frequently used addresses
- Transaction decoder for inline data display
- Export/import configuration sharing
- Advanced pattern testing UI
- Multi-explorer search
- WalletConnect integration

### 📝 Changelog

**v2.0.0** (Current)
- ➕ Added comprehensive explorer configuration system
- ➕ Added Quick Actions and Address Details
- ➕ Added 20+ pre-configured blockchain explorers
- ➕ Added signature matching for Solana
- ➕ Added QR code generation
- ➕ Added multiple address copy formats
- ➕ Added extensive documentation
- 🐛 Fixed duplicate chainId warnings
- ⚡ Improved performance with caching

**v1.0.0** (Initial)
- Basic EVM chain support
- Routescan integration
- Explorer switching
- Transaction/address/block matching

---

## Migration Guide

If you're upgrading from v1.0:

1. **Backup your selected explorer** (will be preserved automatically)
2. **Run `npm install`** to update dependencies
3. **Run `npm run build`** to rebuild
4. **Restart Raycast** to load new extension

Your selected explorer and all settings will be preserved!

---

## Community

Have questions or suggestions?
- File issues on GitHub
- Share your custom configurations
- Contribute new chain definitions

**Happy exploring! 🚀**
