# Multichain Explorer - Technical Implementation Guide

## Architecture Overview

The extension is built with a flexible, extensible architecture that supports:
- Multiple blockchain types (EVM, Solana, Bitcoin, etc.)
- Custom path configurations per explorer
- Custom pattern matching for different address/transaction formats
- User-configurable settings stored in LocalStorage

## Core Components

### 1. Type System (`src/interfaces.d.ts`)

#### Explorer Interface
```typescript
interface Explorer {
  chainName: string;
  explorerName: string;
  baseUrl: string;
  chainId: number;
  currency: string;
  iconUri: string;
  testNet?: boolean;
  imageUrl?: string;
  config?: ExplorerConfig;  // Custom configuration
}
```

#### Configuration Interfaces
```typescript
interface PathConfig {
  transaction?: string;
  address?: string;
  block?: string;
  token?: string;
  ens?: string;
  signature?: string;
}

interface PatternConfig {
  transaction?: { regex: string; normalize?: (input: string) => string };
  address?: { regex: string; normalize?: (input: string) => string };
  signature?: { regex: string; normalize?: (input: string) => string };
  block?: { regex: string; normalize?: (input: string) => string };
  ens?: { regex: string; normalize?: (input: string) => string };
}

interface ExplorerConfig {
  paths?: PathConfig;
  patterns?: PatternConfig;
  useCustomPatternsOnly?: boolean;
}
```

### 2. Pattern Matching System (`src/matchers.ts`)

The matcher system is the heart of the extension. Each matcher class:
- Extends the abstract `Match` base class
- Implements pattern matching logic
- Supports custom configurations
- Generates appropriate URLs

#### Base Match Class
```typescript
abstract class Match {
  readonly search: string;
  readonly explorer: Explorer;
  readonly matchType: MatchType;

  // Gets configured path prefix for this match type
  protected getPathPrefix(): string;

  // Gets custom pattern configuration
  protected getPattern(): { regex: string; normalize?: Function } | undefined;

  // Tests if search matches the pattern
  protected matchesPattern(pattern): boolean;

  abstract get title(): string;
  abstract get path(): string;
  abstract get parsedSearch(): string;
  abstract match(): boolean;
}
```

#### Matcher Classes

**TransactionMatch** - Matches EVM transaction hashes
- Default: 64 hex chars (with/without 0x prefix)
- Custom: Configurable via patterns
- Example: `0xabcd...1234`

**SignatureMatch** - Matches non-EVM signatures (Solana, etc.)
- Default: No matching (requires custom pattern)
- Custom: Base58 for Solana (87-88 chars)
- Example: `5J7Qu...xyz` (Solana signature)

**AddressMatch** - Matches blockchain addresses
- Default: 40 hex chars for EVM (with/without 0x)
- Custom: Configurable for Bitcoin, Solana, etc.
- Examples:
  - EVM: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
  - Solana: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`
  - Bitcoin: `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`

**BlockMatch** - Matches block numbers/hashes
- Default: Numeric only
- Custom: Can support block hashes

**ENSMatch** - Matches ENS domain names
- Default: Ends with `.eth` on Ethereum mainnet
- Custom: Configurable for other naming systems

**TokenMatch** - Extends AddressMatch for tokens
- Matches token addresses
- Integrates with token lists

### 3. Explorer Configurations (`src/explorer-configs.ts`)

Pre-defined configurations for popular explorers that don't follow EVM standards.

#### Configuration Lookup System
```typescript
function getExplorerConfig(baseUrl: string): ExplorerConfig | undefined {
  // Exact match
  if (explorerConfigs[baseUrl]) return explorerConfigs[baseUrl];

  // Domain-based fuzzy match
  const domain = baseUrl.replace(/^(www\.|https?:\/\/)/, "");
  for (const [key, config] of Object.entries(explorerConfigs)) {
    if (key.includes(domain) || domain.includes(key)) {
      return config;
    }
  }

  return undefined;
}
```

#### Example Configuration (Solana)
```typescript
"solscan.io": {
  paths: {
    transaction: "/tx/",
    address: "/account/",      // Different from EVM's /address/
    block: "/block/",
    token: "/token/",
    signature: "/tx/",
  },
  patterns: {
    signature: {
      regex: "^[1-9A-HJ-NP-Za-km-z]{87,88}$",  // Base58
    },
    address: {
      regex: "^[1-9A-HJ-NP-Za-km-z]{32,44}$",  // Base58
    },
    block: {
      regex: "^\\d+$",
    },
  },
}
```

### 4. Custom Chains (`src/custom-chains.ts`)

Defines non-viem chains or chains with special configurations.

```typescript
export const solana: Chain = {
  id: 1399811149,  // Solana's network magic
  name: "Solana",
  nativeCurrency: { decimals: 9, name: "SOL", symbol: "SOL" },
  rpcUrls: { default: { http: ["https://api.mainnet-beta.solana.com"] } },
  blockExplorers: {
    default: { name: "Solscan", url: "https://solscan.io" },
  },
  testnet: false,
};
```

### 5. Configuration UI (`src/configure-explorer.tsx`)

React form component for configuring explorers:
- Editable path fields
- Regex pattern inputs with validation
- Save to LocalStorage
- Reset to defaults

#### Storage Format
```typescript
// Stored in LocalStorage as "custom-explorer-configs"
{
  [chainId: number]: ExplorerConfig
}

// Example:
{
  "1399811149": {  // Solana chainId
    "paths": {
      "transaction": "/tx/",
      "address": "/account/",
      "block": "/block/"
    },
    "patterns": {
      "address": {
        "regex": "^[1-9A-HJ-NP-Za-km-z]{32,44}$"
      }
    }
  }
}
```

### 6. Search Component (`src/search.tsx`)

Main search interface with:
- Auto-detection from selected text
- Clipboard fallback
- Routescan API integration
- Real-time matching
- Multi-section results

#### Configuration Loading Flow
```typescript
useEffect(() => {
  // 1. Load custom configs from LocalStorage
  const customConfigs = JSON.parse(
    await LocalStorage.getItem("custom-explorer-configs")
  );

  // 2. Load selected explorer
  const explorer = JSON.parse(
    await LocalStorage.getItem("selected-explorer")
  );

  // 3. Apply custom config if exists
  if (customConfigs[explorer.chainId]) {
    explorer.config = customConfigs[explorer.chainId];
  }

  // 4. Set state
  setSelectedExplorer(explorer);
}, []);
```

#### Matching Flow
```typescript
useEffect(() => {
  // Create all possible matchers
  const possibleMatches = [
    new SignatureMatch(searchText, selectedExplorer),
    new TransactionMatch(searchText, selectedExplorer),
    new AddressMatch(searchText, selectedExplorer),
    new ENSMatch(searchText, selectedExplorer),
    new BlockMatch(searchText, selectedExplorer),
  ];

  // Filter to only valid matches
  const validMatches = possibleMatches.filter(m => m.match());

  setMatches(validMatches);
}, [searchText, selectedExplorer]);
```

### 7. Explorer List (`src/list-explorers.tsx`)

Explorer management interface:
- Browse all available explorers
- Switch active explorer
- Configure custom settings
- View configuration status

## Data Flow

### Search Flow
```
User Input (highlight/type)
    ↓
Selected Text API / Clipboard
    ↓
Search Text State
    ↓
Create Matchers (with custom config)
    ↓
Filter Valid Matches
    ↓
Display Results
    ↓
User Selection → Open in Browser
```

### Configuration Flow
```
List Explorers View
    ↓
User selects "Configure Explorer"
    ↓
Configure Form (pre-filled with current config)
    ↓
User edits paths/patterns
    ↓
Save to LocalStorage (custom-explorer-configs)
    ↓
Update Explorer Instance
    ↓
Matchers use new config
```

## Key Design Decisions

### 1. Matcher Hierarchy
Each matcher checks custom patterns first, then falls back to defaults. This allows:
- Pre-configured explorers to work out-of-the-box
- Users to override any behavior
- Graceful degradation if config is invalid

### 2. Configuration Priority
```
1. User's custom config (LocalStorage)
2. Pre-defined explorer config (explorer-configs.ts)
3. Default EVM behavior
```

### 3. Pattern Normalization
Patterns can include a `normalize` function:
```typescript
{
  regex: "^[a-f0-9]{64}$",
  normalize: (input) => input.startsWith("0x") ? input : "0x" + input
}
```

This allows:
- Flexible input acceptance
- Canonical output format
- Chain-specific transformations

### 4. LocalStorage Schema
We use separate keys for:
- `selected-explorer`: Currently active explorer
- `custom-explorer-configs`: Map of chainId → config

This separation allows:
- Fast explorer switching
- Persistent custom configurations
- Easy reset per explorer

## Extending the System

### Adding a New Blockchain

1. **Add Chain Definition** (`src/custom-chains.ts`)
```typescript
export const myChain: Chain = {
  id: 12345,
  name: "My Blockchain",
  nativeCurrency: { decimals: 18, name: "MBC", symbol: "MBC" },
  rpcUrls: { default: { http: ["https://rpc.mychain.io"] } },
  blockExplorers: {
    default: { name: "MyChainScan", url: "https://mychainscan.io" },
  },
  testnet: false,
};
```

2. **Add Pre-Configuration** (if needed, `src/explorer-configs.ts`)
```typescript
"mychainscan.io": {
  paths: {
    transaction: "/transaction/",
    address: "/wallet/",
  },
  patterns: {
    address: {
      regex: "^mychain1[a-z0-9]{38}$",
    },
  },
}
```

3. **Add Chain Icon** (`assets/my-blockchain.svg`)

4. **Rebuild**
```bash
npm run build
```

### Adding a New Match Type

1. **Add Type** (`src/interfaces.d.ts`)
```typescript
export type MatchType = "transaction" | "address" | "block" | "token" | "ens" | "signature" | "your_new_type";
```

2. **Update PathConfig**
```typescript
interface PathConfig {
  // ... existing
  your_new_type?: string;
}
```

3. **Create Matcher** (`src/matchers.ts`)
```typescript
export class YourNewMatch extends Match {
  constructor(search: string, explorer: Explorer) {
    super(search, explorer, "your_new_type");
  }

  match() {
    // Your matching logic
    const pattern = this.getPattern();
    if (pattern) return this.matchesPattern(pattern);
    return false;  // Default behavior
  }

  // ... implement other methods
}
```

4. **Add to Search Flow** (`src/search.tsx`)
```typescript
const possibleMatches = [
  new YourNewMatch(searchText, selectedExplorer),
  // ... existing matchers
];
```

## Performance Considerations

### 1. Debouncing
Search queries to Routescan API are debounced (300ms) to prevent excessive requests.

### 2. Lazy Loading
Custom configs are only loaded:
- On component mount
- When switching explorers
- After configuration changes

### 3. Memoization
Match objects are recreated only when search text or selected explorer changes.

### 4. LocalStorage Caching
Explorer configurations are cached in LocalStorage to avoid:
- Repeated API calls
- Re-computation of defaults
- Network latency

## Error Handling

### Configuration Errors
```typescript
try {
  const config = JSON.parse(configJson);
  // Validate config structure
  if (!isValidConfig(config)) throw new Error();
  return config;
} catch (error) {
  console.error("Invalid config, using defaults");
  return defaultConfig;
}
```

### Pattern Matching Errors
```typescript
try {
  const regex = new RegExp(pattern.regex);
  return regex.test(input);
} catch (error) {
  console.error("Invalid regex pattern");
  return false;  // Fail gracefully
}
```

### Storage Errors
```typescript
try {
  await LocalStorage.setItem(key, value);
} catch (error) {
  showToast({
    title: "Error",
    message: "Failed to save configuration"
  });
}
```

## Testing Strategies

### Unit Tests (Recommended)
```typescript
describe('TransactionMatch', () => {
  it('should match EVM transaction with 0x prefix', () => {
    const match = new TransactionMatch('0x' + 'a'.repeat(64), mockExplorer);
    expect(match.match()).toBe(true);
  });

  it('should match custom pattern', () => {
    const explorerWithConfig = {
      ...mockExplorer,
      config: {
        patterns: {
          transaction: { regex: '^custom[0-9]+$' }
        }
      }
    };
    const match = new TransactionMatch('custom123', explorerWithConfig);
    expect(match.match()).toBe(true);
  });
});
```

### Integration Tests
1. Test configuration save/load
2. Test explorer switching with config persistence
3. Test Routescan API integration
4. Test multi-chain detection

### Manual Testing Checklist
- [ ] Highlight text and trigger extension
- [ ] Paste into search bar
- [ ] Switch between mainnets and testnets
- [ ] Configure custom explorer
- [ ] Reset configuration
- [ ] Search Solana address on Solscan
- [ ] Search Bitcoin address on Blockchain.com
- [ ] Search EVM transaction across multiple chains
- [ ] Verify Routescan auto-detection

## New Feature: Quick Actions & Address Details

### Overview
The Quick Actions feature provides powerful utilities for working with blockchain addresses and transactions directly from Raycast.

### Components

#### 1. Blockchain Utilities (`src/utils/blockchain-utils.ts`)

**Address Validation & Formatting:**
- `isValidEthereumChecksum()`: EIP-55 checksum validation
- `toChecksumAddress()`: Convert to checksummed format
- `shortenAddress()`: Display-friendly shortened addresses
- `getAddressVariations()`: Get all format variations
- `validateAddress()`: Chain-specific validation

**QR Code Generation:**
- `generateQRCode()`: SVG-based QR code generation
- Returns base64-encoded data URL
- Configurable size

**Format Conversions:**
- `weiToEther()`: Wei → ETH conversion
- `lamportsToSol()`: Lamports → SOL conversion
- `satoshisToBtc()`: Satoshis → BTC conversion

**Chain Detection:**
- `getChainType()`: Detect blockchain type from URL
- Returns: `ethereum | solana | bitcoin | other`

#### 2. Address Detail View (`src/components/address-detail.tsx`)

**Features:**
- Large QR code display
- Address format variations
- Checksum validation status
- Chain information metadata
- Educational content about address formats
- Multiple copy actions

**Action Panel:**
- Primary: Open in explorer
- Copy: Multiple format options
- Ethereum Tools: Payment URI
- Share: Formatted details

**Metadata Display:**
- Network name and currency
- Address format type
- Character length
- Checksum validation status
- Explorer link

#### 3. Enhanced Search Actions

**Organized Action Panels:**
```typescript
<ActionPanel>
  <ActionPanel.Section title="Primary Actions">
    // Open in browser
  </ActionPanel.Section>

  <ActionPanel.Section title="Copy Actions">
    // Multiple copy formats
  </ActionPanel.Section>

  <ActionPanel.Section title="Address Tools">
    // Address-specific actions
  </ActionPanel.Section>

  <ActionPanel.Section title="Sharing">
    // Formatted sharing options
  </ActionPanel.Section>
</ActionPanel>
```

**Copy Variations:**
- Original address
- Checksummed (EIP-55)
- Lowercase
- Without 0x prefix
- With 0x prefix
- Payment URI
- Explorer URL

### User Flow

```
User searches for address
    ↓
Results show with Quick Actions
    ↓
User presses ⌘ + D
    ↓
Address Details view opens
    ↓
Shows QR code + metadata
    ↓
User copies desired format
```

### Technical Implementation

#### Checksum Algorithm (EIP-55)
```typescript
function toChecksumAddress(address: string): string {
  const addr = address.slice(2).toLowerCase();
  const hash = keccak256(addr);

  let checksummed = "0x";
  for (let i = 0; i < addr.length; i++) {
    const hashByte = parseInt(hash[i], 16);
    if (hashByte >= 8) {
      checksummed += addr[i].toUpperCase();
    } else {
      checksummed += addr[i];
    }
  }

  return checksummed;
}
```

#### Address Variations
```typescript
interface AddressVariations {
  original: string;
  lowercase: string;
  checksummed?: string;
  withoutPrefix?: string;
  withPrefix?: string;
}
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ + C` | Copy value |
| `⌘ + ⇧ + C` | Copy explorer URL |
| `⌘ + D` | View address details |
| `⌘ + Q` | Copy payment URI |
| `⌘ + ⇧ + S` | Copy formatted for sharing |

### Benefits

1. **Error Prevention**: Checksummed addresses prevent typos
2. **Compatibility**: Multiple formats for different platforms
3. **Mobile Transfer**: QR codes for easy scanning
4. **Developer Productivity**: Quick access to all formats
5. **User Education**: Built-in format explanations

### Use Cases

**For Developers:**
- Copy checksummed address for smart contracts
- Get lowercase for API calls
- Remove 0x for certain explorers
- View QR for mobile wallet testing

**For Users:**
- Scan QR with mobile wallet
- Copy payment URI for wallet apps
- Share formatted details
- Validate address checksums

**For Traders:**
- Quick copy for token transfers
- Verify address before sending
- Share addresses safely
- Mobile wallet integration

## Future Enhancements

### Potential Features
1. **Export/Import Configurations**: Allow users to share configs
2. **Configuration Templates**: Pre-made configs for popular chains
3. **Advanced Pattern Editor**: Visual regex builder
4. **Multi-Explorer Search**: Search same hash across all explorers
5. **Transaction Decoder**: Show decoded transaction data inline ✅
6. **Address Book**: Save frequently used addresses
7. **QR Code Support**: Scan QR codes for addresses ✅ IMPLEMENTED
8. **WalletConnect Integration**: Connect to wallets directly
9. **Address Details View**: Rich address information ✅ IMPLEMENTED
10. **Copy Format Variations**: Multiple copy formats ✅ IMPLEMENTED

### Architecture Improvements
1. **Configuration Validation**: JSON Schema for configs
2. **Pattern Testing UI**: Test regex patterns before saving
3. **Performance Monitoring**: Track match times
4. **Offline Support**: Cache common queries
5. **Analytics**: Track most used chains/features

## Conclusion

This implementation provides:
- ✅ Flexible, extensible architecture
- ✅ Support for any blockchain explorer
- ✅ User-friendly configuration UI
- ✅ Robust error handling
- ✅ Type-safe TypeScript code
- ✅ LocalStorage persistence
- ✅ Pre-configured popular chains
- ✅ Custom pattern matching
- ✅ Seamless UX integration

The modular design makes it easy to add new chains, match types, and features without major refactoring.
