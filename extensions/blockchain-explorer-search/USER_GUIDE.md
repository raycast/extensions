# Multichain Explorer - User Guide

## Overview
Multichain Explorer is a powerful Raycast extension that lets you quickly search blockchain explorers across multiple networks including Ethereum, Solana, Bitcoin, and many more. With custom pattern matching and path configuration, you can search any blockchain explorer with ease.

## Table of Contents
1. [Installation & Setup](#installation--setup)
2. [Basic Usage](#basic-usage)
3. [Advanced Features](#advanced-features)
4. [Custom Explorer Configuration](#custom-explorer-configuration)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Tips & Tricks](#tips--tricks)

---

## Installation & Setup

### Installing the Extension
1. Build the extension:
   ```bash
   npm install
   npm run build
   ```

2. In Raycast, go to **Extensions** → **Add Extension** → **Import Extension**
3. Select the `multichain-explorer` directory

### Setting Up a Keyboard Shortcut
To make the extension even more accessible:

1. Open Raycast preferences (⌘ + ,)
2. Go to **Extensions** tab
3. Find **Multichain Explorer** → **Search**
4. Click on the command row
5. Set your preferred hotkey (e.g., `⌥ + ⇧ + B` for blockchain search)
6. Now you can trigger the search from anywhere!

---

## Basic Usage

### Searching with Text Selection

The easiest way to search is by highlighting text:

1. **Select/highlight** any blockchain address, transaction hash, or block number in any app
2. Press your configured hotkey (or open Raycast and type "Multichain Explorer")
3. The extension will automatically:
   - Read your selected text
   - Detect what type of data it is (address, transaction, block, etc.)
   - Show relevant results

**Example Workflow:**
```
1. See a transaction hash: 0x1234...abcd
2. Highlight it with your mouse
3. Press ⌥ + ⇧ + B (your hotkey)
4. Extension opens with results automatically!
```

### Searching Manually

If you don't have text selected:

1. Open the extension (hotkey or Raycast command)
2. Type or paste your search query
3. Results appear as you type
4. Select the result and press Enter to open in browser

### What You Can Search

The extension automatically detects and supports:

#### EVM Chains (Ethereum, Polygon, Arbitrum, etc.)
- **Transactions**: `0x` + 64 hex characters
- **Addresses**: `0x` + 40 hex characters
- **Blocks**: Any number (e.g., `12345678`)
- **ENS Names**: Ending in `.eth` (Ethereum only)

#### Solana
- **Signatures/Transactions**: 87-88 base58 characters
- **Addresses**: 32-44 base58 characters
- **Blocks**: Numbers

#### Bitcoin
- **Transactions**: 64 hex characters
- **Addresses**: Starting with `1`, `3`, or `bc1`
- **Blocks**: Numbers or 64 hex characters

#### Other Chains
See the [Custom Explorer Configuration](#custom-explorer-configuration) section to add support for any blockchain!

---

## Advanced Features

### Quick Actions Menu

Every search result now comes with powerful quick actions:

#### For All Results
- **Copy Value** (`⌘ + C`): Copy the hash/address/block number
- **Copy Explorer URL** (`⌘ + ⇧ + C`): Copy the full explorer URL
- **Copy Formatted for Sharing** (`⌘ + ⇧ + S`): Copy nicely formatted text perfect for sharing

#### For Addresses Only
- **View Address Details** (`⌘ + D`): See detailed address information with QR code
- **Copy Checksummed Address**: Copy the EIP-55 checksummed version (prevents errors)
- **Copy Without 0x Prefix**: Copy address without the 0x prefix
- **Copy Lowercase**: Copy all-lowercase version
- **Copy as Payment URI** (`⌘ + Q`): Copy as `ethereum:0x...` URI for wallets
- **QR Code**: Visual QR code for easy mobile scanning

#### Address Details View

Press `⌘ + D` on any address to see:
- **Large QR Code**: For easy scanning
- **Multiple Format Options**: Checksummed, lowercase, with/without prefix
- **Chain Information**: Network, currency, explorer details
- **Format Validation**: Checksum validation indicator
- **Payment URI**: Ready-to-use wallet URI
- **Quick Tips**: Best practices for using each format

**Example Use Case:**
```
1. Search for address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
2. Press ⌘ + D to view details
3. See QR code, checksummed version, and format info
4. Copy checksummed version for maximum compatibility
```

### Automatic Chain Detection with Routescan

The extension integrates with Routescan API to automatically detect which chain a transaction belongs to:

1. Paste any transaction hash
2. Extension queries Routescan
3. If found on a specific chain, it **automatically switches** to that chain's explorer
4. You'll see a toast notification: "Chain Detected - Transaction found on [Chain Name]"

### Multi-Network Token Discovery

When you search for a token address:
- Extension shows token details from Routescan
- Displays: Name, symbol, decimals, market cap
- Shows social links and tags
- Works across all supported networks

### Searching Multiple Chains

Use the dropdown menu to switch between explorers:

1. Click the dropdown in the search bar (top right)
2. Choose from:
   - **Mainnets**: All production networks
   - **Testnets**: Development/test networks
3. Your selection is remembered for next time

---

## Adding Custom Blockchains (No Code Required!)

**NEW!** You can now add any blockchain explorer directly from Raycast with a simple form!

### Quick Add Custom Chain

1. Open Raycast → **List Explorers**
2. Press **`⌘ + N`** (Command + N)
3. Fill in the form:
   - **Chain Name**: e.g., "Polygon"
   - **Explorer URL**: e.g., "polygonscan.com"
   - **Chain ID**: e.g., "137" (find on [ChainList.org](https://chainlist.org))
   - **Currency Symbol**: e.g., "MATIC"
4. Click **"Add Chain"**

Done! Your chain now appears everywhere in the extension.

### Managing Custom Chains

- **Edit**: Press `⌘ + U` on any custom chain
- **Delete**: Press `⌘ + ⇧ + Delete` on any custom chain
- **Configure Paths**: Press `⌘ + E` to set custom URL paths

**See the complete guide**: [ADD_CUSTOM_CHAIN_GUIDE.md](./ADD_CUSTOM_CHAIN_GUIDE.md)

---

## Custom Explorer Configuration

This is the most powerful feature! You can configure ANY blockchain explorer to work with the extension.

### Why Configure an Explorer?

Different blockchains use different URL structures:
- Ethereum: `etherscan.io/tx/0x123...`
- Solana: `solscan.io/account/ABC123...`
- Aptos: `aptoscan.com/account/0x1...`

Custom configuration lets you define these patterns.

### How to Configure an Explorer

1. Open **List Explorers** command in Raycast
2. Find the explorer you want to configure
3. Press `⌘ + E` or select **Configure Explorer**
4. Fill out the configuration form:

#### Path Configuration

Define URL paths for each search type:

| Field | Example | Description |
|-------|---------|-------------|
| **Transaction Path** | `/tx/` | Where transactions are shown |
| **Address Path** | `/address/` or `/account/` | Where addresses are shown |
| **Block Path** | `/block/` | Where blocks are shown |
| **Token Path** | `/token/` | Where tokens are shown |
| **Signature Path** | `/tx/` | For signature-based chains |

**Example for Solana (Solscan):**
```
Transaction Path: /tx/
Address Path: /account/      ← Different from Ethereum!
Block Path: /block/
Token Path: /token/
```

#### Pattern Configuration (Optional but Powerful!)

Define regex patterns to match specific input formats:

| Field | Example Pattern | Matches |
|-------|----------------|---------|
| **Transaction Pattern** | `^0x[a-fA-F0-9]{64}$` | EVM tx hashes |
| **Address Pattern** | `^[1-9A-HJ-NP-Za-km-z]{32,44}$` | Solana addresses |
| **Signature Pattern** | `^[1-9A-HJ-NP-Za-km-z]{87,88}$` | Solana signatures |
| **Block Pattern** | `^\d+$` | Numeric blocks |

**Why Use Patterns?**
- Ensures only valid inputs are matched
- Enables support for non-EVM chains
- Prevents false positives

### Pre-Configured Explorers

The following explorers come pre-configured:

**Solana:**
- Solscan (solscan.io)
- Solana Explorer (explorer.solana.com)

**Bitcoin:**
- Blockchain.com
- Blockchair

**Other Chains:**
- Cardano (cardanoscan.io)
- Sui (suiscan.xyz, suiexplorer.com)
- Aptos (aptoscan.com, explorer.aptoslabs.com)
- Tron (tronscan.org)
- Near (nearblocks.io, explorer.near.org)
- Algorand (algoexplorer.io)
- Stellar (stellarchain.io)
- Polkadot (polkadot.subscan.io)
- XRP (xrpscan.com, livenet.xrpl.org)
- Cosmos Hub (mintscan.io)

### Example: Configuring a Custom Explorer

Let's say you want to add support for a new blockchain called "MyCoolChain" with explorer at `mycoolscan.io`:

1. First, add the chain to `src/custom-chains.ts`:
```typescript
export const myCoolChain: Chain = {
  id: 12345,
  name: "MyCoolChain",
  nativeCurrency: { decimals: 18, name: "COOL", symbol: "COOL" },
  rpcUrls: { default: { http: ["https://rpc.mycoolchain.io"] } },
  blockExplorers: {
    default: { name: "MyCoolScan", url: "https://mycoolscan.io" },
  },
  testnet: false,
};

export const customChains: Chain[] = [coqnet, solana, myCoolChain];
```

2. Open **List Explorers** → Find **MyCoolChain** → Press `⌘ + E`

3. Configure paths:
```
Transaction Path: /transaction/
Address Path: /wallet/
Block Path: /block-details/
Token Path: /token-info/
```

4. Add patterns if addresses have a special format:
```
Address Pattern: ^cool1[a-z0-9]{38}$
Transaction Pattern: ^[a-fA-F0-9]{64}$
```

5. Save! Now the extension fully supports MyCoolChain.

---

## Keyboard Shortcuts

### In Search View

| Shortcut | Action |
|----------|--------|
| `Type` | Search across all types |
| `Enter` | Open selected result in browser |
| `⌘ + C` | Copy value to clipboard |
| `⌘ + ⇧ + C` | Copy explorer URL |
| `⌘ + D` | View address details (addresses only) |
| `⌘ + Q` | Copy as payment URI (addresses only) |
| `⌘ + ⇧ + S` | Copy formatted for sharing |
| `↑` / `↓` | Navigate results |
| `Esc` | Close extension |

### In List Explorers View

| Shortcut | Action |
|----------|--------|
| `Enter` | Open explorer website |
| `⌘ + N` | Add custom chain |
| `⌘ + E` | Configure selected explorer |
| `⌘ + U` | Edit custom chain |
| `⌘ + ⇧ + Delete` | Delete custom chain |
| `⌘ + C` | Copy explorer URL |
| `Type` | Filter/search explorers |

### Global

| Shortcut | Action |
|----------|--------|
| Your hotkey | Open from anywhere |
| `⌘ + K` | Open Raycast command palette |

---

## Tips & Tricks

### 1. Quick Copy & Search
- Select a hash → Press hotkey → Results appear
- Even faster than going to the website!

### 2. Use Clipboard Fallback
If you don't select text, the extension checks your clipboard automatically.

### 3. Search Multiple Formats
The extension is smart about formats:
- `0x123...` works
- `123...` (without 0x) works too
- Blocks can be numbers or hashes (where supported)

### 4. Organize by Network Type
In the List Explorers view, explorers are grouped by:
- **Mainnets** - Production networks
- **Testnets** - Development networks

### 5. Check Configuration Status
Explorers with custom configurations show a ⚙️ gear icon in List Explorers view.

### 6. Reset Configuration
In the Configure Explorer form, use **Reset to Defaults** to remove custom settings.

### 7. Multi-Chain Tokens
When searching token addresses, results may appear from multiple chains. Check the chain indicator on each result.

### 8. ENS Names
ENS names (*.eth) only work on Ethereum mainnet. The extension automatically limits ENS searches to Ethereum.

### 9. Signature vs Transaction
For Solana and similar chains:
- **Signatures** = Unique transaction identifiers (base58)
- **Transactions** = Standard tx hashes
Both work, but signatures are more common on Solana.

### 10. Browser Action
All results open in your default browser. Make sure you have a browser configured!

### 11. Checksummed Addresses
Always use checksummed addresses (EIP-55) when sending transactions on Ethereum and EVM chains. Press `⌘ + D` to view the checksummed version of any address.

### 12. QR Codes for Mobile
Use the Address Details view (`⌘ + D`) to see a QR code you can scan with mobile wallets. Perfect for transferring addresses to your phone!

### 13. Multiple Copy Formats
Different platforms and smart contracts require different address formats:
- **Checksummed**: Best for general use (mixed case)
- **Lowercase**: For some APIs and contracts
- **Without 0x**: For certain blockchain explorers
- **Payment URI**: For wallets and payment apps

---

## Troubleshooting

### "No matches found"
- Check that you've selected the correct network in the dropdown
- Verify the format of your search (transaction should be 64-66 chars for EVM)
- Try configuring custom patterns if it's a non-standard chain

### Configuration not working
- Rebuild the extension: `npm run build`
- Restart Raycast
- Check that patterns are valid regex

### Selected text not auto-filling
- Make sure you grant Raycast accessibility permissions
- Check Raycast settings → Privacy → Accessibility

### Chain not appearing
- Verify it's added to `custom-chains.ts`
- Ensure it has a `blockExplorers.default` property
- Rebuild: `npm run build`

---

## Examples

### Example 1: Searching Ethereum Transaction
```
1. See transaction: 0xabcd1234...
2. Highlight it
3. Press hotkey
4. Extension shows: "Transaction 0xabcd1234..."
5. Press Enter → Opens in Etherscan
```

### Example 2: Searching Solana Address
```
1. Copy Solana address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
2. Press hotkey (clipboard auto-detected)
3. Select "Solana" from dropdown if not already selected
4. Extension shows: "Address 7xKXtg2CW87d..."
5. Press Enter → Opens in Solscan account page
```

### Example 3: Configuring Bitcoin Explorer
```
1. Open List Explorers
2. Search for "Bitcoin"
3. Press ⌘ + E
4. Set paths:
   - Transaction Path: /btc/tx/
   - Address Path: /btc/address/
5. Set patterns:
   - Address Pattern: ^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$
6. Save
7. Now Bitcoin addresses are fully supported!
```

---

## Contributing & Support

### Adding New Chains
1. Add chain definition to `src/custom-chains.ts`
2. Optionally add pre-config to `src/explorer-configs.ts`
3. Add chain icon SVG to `assets/[chain-name].svg`
4. Build and test

### Filing Issues
If you encounter bugs or have feature requests, please include:
- What you searched for
- Which chain/explorer
- Expected vs actual behavior
- Screenshots if relevant

---

## Advanced: Configuration API

For developers who want to programmatically configure explorers:

### ExplorerConfig Interface
```typescript
interface ExplorerConfig {
  paths?: {
    transaction?: string;
    address?: string;
    block?: string;
    token?: string;
    ens?: string;
    signature?: string;
  };
  patterns?: {
    transaction?: { regex: string; normalize?: (input: string) => string };
    address?: { regex: string; normalize?: (input: string) => string };
    signature?: { regex: string; normalize?: (input: string) => string };
    block?: { regex: string; normalize?: (input: string) => string };
    ens?: { regex: string; normalize?: (input: string) => string };
  };
  useCustomPatternsOnly?: boolean;
}
```

### Adding to explorer-configs.ts
```typescript
export const explorerConfigs: Record<string, ExplorerConfig> = {
  "mycoolscan.io": {
    paths: {
      transaction: "/tx/",
      address: "/account/",
      block: "/block/",
    },
    patterns: {
      address: {
        regex: "^cool1[a-z0-9]{38}$",
      },
      transaction: {
        regex: "^[a-fA-F0-9]{64}$",
      },
    },
  },
};
```


---

## Conclusion

Multichain Explorer brings the power of blockchain search to your fingertips. Whether you're:
- A developer debugging transactions
- A researcher analyzing addresses
- A trader tracking tokens
- An enthusiast exploring multiple chains

This extension makes blockchain exploration seamless, fast, and customizable.

**Happy exploring! 🚀**
