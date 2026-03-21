# Algorand Raycast Extension

A powerful Raycast extension that brings the full capabilities of the Algorand blockchain directly to your macOS toolbar. Manage wallets, send transactions, swap assets, and more - all without leaving your workflow.

![Algorand Raycast Extension](https://github.com/hatif03/algorand-mcp/blob/main/raycast/algorand/metadata/screenshot.png)

## ✨ Features

### 🔐 Wallet Management
- **Secure wallet creation** with encrypted mnemonic storage
- **Wallet info display** with balance and asset holdings
- **Export wallet** functionality with security warnings
- **Testnet funding** for development and testing

### 💸 Transactions
- **Send ALGO** with customizable amounts and notes
- **Asset transfers** for all Algorand Standard Assets (ASAs)
- **Transaction history** with detailed formatting and explorer links
- **Real-time balance updates** and confirmations

### 🪙 Asset Operations
- **Create ASAs** with full customization (name, symbol, supply, etc.)
- **Asset information** lookup with comprehensive details
- **Opt-in to assets** for receiving tokens
- **Detailed asset display** in wallet info with proper formatting

### 🔄 Swap Functionality (NEW!)
- **Asset swapping** powered by Pera Swap SDK
- **Multi-DEX support** (Tinyman, Vestige, and more)
- **Real-time quotes** with price impact and slippage control
- **Seamless execution** with secure transaction signing

### ⚡ Quick Actions
- **Keyboard shortcuts** for all major functions
- **Copy addresses** and mnemonics with one click
- **AlgoExplorer integration** for transaction verification
- **Toast notifications** for operation feedback

## 🚀 Installation

1. **Clone or download** this extension
2. **Install dependencies**:
   ```bash
   cd raycast/algorand
   npm install
   ```
3. **Build the extension**:
   ```bash
   npm run build
   ```
4. **Import into Raycast**:
   - Open Raycast
   - Go to Extensions
   - Click "Import Extension"
   - Select this folder

## 🎯 Commands

### Core Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| **Wallet Info** | View wallet details, balance, and assets | - |
| **Send ALGO** | Send Algorand payments | `⌘S` |
| **Swap Assets** | Exchange tokens using DEX aggregation | `⌘X` |
| **Create Asset** | Create new ASA tokens | `⌘C` |
| **Transfer Asset** | Send ASA tokens | `⌘T` |
| **Transaction History** | View all wallet transactions | `⌘H` |
| **Asset Info** | Get detailed asset information | `⌘I` |
| **Export Wallet** | Securely export wallet details | `⌘E` |

### Quick Actions (from Wallet Info)

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Copy Address** | - | Copy wallet address to clipboard |
| **Copy Mnemonic** | `⌘M` | Copy mnemonic phrase securely |
| **Refresh Balance** | `⌘R` | Update account information |
| **Fund Testnet** | `⌘F` | Get testnet ALGO from faucet |
| **Reset Wallet** | `⌘⇧R` | Create new wallet (destructive) |

## 🔧 Technical Details

### Architecture
- **TypeScript** with full type safety
- **Algorand SDK** for blockchain interactions
- **Pera Swap SDK** for DEX aggregation
- **AES-256-CBC encryption** for secure storage
- **Raycast API** for native UI components

### Security Features
- **Encrypted mnemonic storage** using system-level encryption
- **Secure key derivation** with crypto.scryptSync
- **No plaintext secrets** stored on disk
- **Transaction confirmation** before execution
- **Testnet by default** for safety

### Supported Networks
- **Algorand Testnet** (default)
- **Easy mainnet switching** via configuration
- **AlgoNode API endpoints** for reliability

## 📱 Usage Examples

### Creating Your First Wallet
1. Run **"Wallet Info"** command
2. Extension automatically creates a secure wallet
3. **Fund testnet** account using the built-in faucet
4. Start sending transactions and swapping assets!

### Swapping Assets
1. Use **"Swap Assets"** command (`⌘X`)
2. Select **from/to assets** using the dropdown
3. Enter **amount** to swap
4. Review **quote** with price impact
5. **Execute swap** with one click

### Managing Assets
1. **Create ASAs** with custom properties
2. **Transfer tokens** to other addresses  
3. **View asset details** with comprehensive info
4. **Track holdings** in wallet info display

## 🛡️ Security Considerations

### Important Notes
- **Mnemonic phrases** are your wallet's master key
- **Keep backups secure** and never share them
- **Use testnet** for development and learning
- **Verify transactions** on AlgoExplorer before mainnet use

### Best Practices
- **Export wallet** and store mnemonic securely
- **Test on testnet** before mainnet operations
- **Verify recipient addresses** before sending
- **Keep the extension updated** for security patches

## 🔗 Links

- [Algorand Developer Portal](https://developer.algorand.org/)
- [AlgoExplorer Testnet](https://lora.algokit.io/testnet/)
- [Pera Swap](https://app.pera.finance/)
- [Raycast Store](https://raycast.com/store)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Setup
```bash
# Install dependencies
npm install

# Build for development
npm run dev

# Build for production
npm run build
```

## 📄 License

This project is licensed under the MIT License.

---

**Made with ❤️ for the Algorand community**

Transform your Algorand workflow with the power of Raycast! 🚀