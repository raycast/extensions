# 🧭 CryptoCompass

> **Navigate the crypto landscape with precision**

A powerful Raycast extension that serves as your comprehensive cryptocurrency toolkit. Convert SLIP-0044 IDs, convert amounts between human-readable and decimal formats, and get real-time cryptocurrency prices.

## ✨ Features

### 🔄 **SLIP-0044 Converter**
- **100+ cryptocurrencies** supported (Bitcoin, Ethereum, EOS, SONIC, and many more!)
- **Bidirectional conversion**: Coin type ID ↔ Network name
- **Smart search**: Find networks by name, symbol, or aliases
- **Token standard support**: ERC-20, BEP-20, TRC-20, SPL, and more
- **Testnet filtering**: Option to show/hide testnet networks

### 🧮 **Decimal Converter**
- **Precise conversion**: Human-readable amounts ↔ Smallest units
- **Network-specific decimals**: Automatic decimal place detection
- **No scientific notation**: Pure string manipulation for accuracy
- **Large number formatting**: Automatic comma separators

### 💰 **Real-Time Price Data**
- **Multi-source pricing**: CoinGecko, CoinPaprika, Binance APIs
- **Automatic updates**: Fresh prices every minute
- **Smart caching**: 1-minute TTL for optimal performance
- **USD conversion**: Convert amounts to US dollar values

### 🎯 **Smart Search & Discovery**
- **Fuzzy matching**: Find networks even with partial names
- **Alias support**: Multiple search terms for each network
- **Priority sorting**: Mainnet networks appear first
- **Instant results**: Fast, responsive search experience

## 🚀 Installation

### Prerequisites
- [Raycast](https://raycast.com/) installed on your Mac
- Node.js 18+ and npm

### Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/AfshinHonari/crypto-compass.git
   cd crypto-compass
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Development mode**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🎮 Usage

### Main Converter Command
- **Command**: `Convert SLIP-0044`
- **Usage**: Search for networks by name, symbol, or coin type
- **Examples**:
  - `bitcoin` → Bitcoin network (coin type 0)
  - `eth` → Ethereum network (coin type 60)
  - `eos` → EOS network (coin type 194)
  - `sonic` → SONIC network (coin type 194002)
  - `0` → Bitcoin (by coin type)

### Decimal Converter Command
- **Command**: `Decimal Converter`
- **Usage**: Convert between human amounts and smallest units
- **Examples**:
  - `1.5 ETH` → `1500000000000000000` (wei)
  - `1000000000000000000` → `1 ETH` (from wei)
  - `0.001 BTC` → `100000` (satoshi)

### Custom Conversion
- **Access**: Click "Convert Custom Amount" on any network
- **Features**:
  - Live conversion as you type
  - Real-time price fetching
  - USD value calculation
  - Copy results to clipboard

## 🏗️ Architecture

### Core Components
- **`src/slip44.ts`**: SLIP-0044 data management and conversion utilities
- **`src/convert.tsx`**: Main converter interface
- **`src/decimal-converter.tsx`**: Dedicated decimal conversion tool

### Data Sources
- **SLIP-0044 Standard**: Official coin type registry
- **Extended Database**: 100+ additional cryptocurrencies
- **Price APIs**: CoinGecko, CoinPaprika, Binance
- **Local Fallback**: Comprehensive offline support

### Performance Features
- **Smart Caching**: 1-minute TTL for API responses
- **Lazy Loading**: Data fetched only when needed
- **Memory Efficient**: Optimized data structures
- **Fast Search**: Indexed lookups for instant results

## 🔧 Configuration

### Preferences
- **Show Testnets**: Toggle testnet network visibility
- **Auto-fetch Prices**: Enable/disable automatic price updates

### Customization
- **Network Filtering**: Focus on specific token standards
- **Decimal Precision**: Network-specific decimal handling
- **Search Behavior**: Customize search result ordering

## 🌟 Supported Networks

### Major Layer 1s
- **Bitcoin** (BTC) - 8 decimals
- **Ethereum** (ETH) - 18 decimals
- **Cardano** (ADA) - 6 decimals
- **Solana** (SOL) - 9 decimals
- **Polkadot** (DOT) - 10 decimals
- **Cosmos** (ATOM) - 6 decimals

### Layer 2 & Scaling
- **Polygon** (MATIC) - 18 decimals
- **Arbitrum** (ARB) - 18 decimals
- **Optimism** (OP) - 18 decimals
- **Base** (BASE) - 18 decimals
- **Linea** (LINEA) - 18 decimals

### Popular Altcoins
- **EOS** (EOS) - 4 decimals
- **SONIC** (SONIC) - 18 decimals
- **Tron** (TRX) - 6 decimals
- **Tezos** (XTZ) - 6 decimals
- **VeChain** (VET) - 18 decimals

### DeFi & Gaming
- **Uniswap** (UNI) - 18 decimals
- **Aave** (AAVE) - 18 decimals
- **Chainlink** (LINK) - 18 decimals
- **Decentraland** (MANA) - 18 decimals
- **Axie Infinity** (AXS) - 18 decimals

## 🛠️ Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run linting
npm run fix-lint     # Fix linting issues
npm run publish      # Publish to Raycast Store
```

### Code Style
- **TypeScript**: Full type safety
- **React**: Modern functional components
- **ESLint**: Code quality enforcement
- **Prettier**: Consistent formatting

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request


## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Areas for Contribution
- **New Networks**: Add support for additional cryptocurrencies
- **Price Sources**: Integrate new price APIs
- **UI Improvements**: Enhance the user experience
- **Performance**: Optimize search and conversion speed
- **Documentation**: Improve guides and examples

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **SLIP-0044 Community**: For the coin type standard
- **Raycast Team**: For the excellent extension platform
- **Crypto APIs**: CoinGecko, CoinPaprika, Binance
- **Open Source Contributors**: Everyone who helps improve this tool

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/AfshinHonari/crypto-compass/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AfshinHonari/crypto-compass/discussions)
- **Email**: your.email@example.com

---

**Made with ❤️ by the CryptoCompass Team**

*Navigate the crypto landscape with confidence and precision.*


