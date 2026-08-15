# NEAR Rewards - Raycast Extension

A comprehensive Raycast extension for monitoring NEAR Protocol accounts, including balances, staking rewards, lockup contracts, and historical data comparison.

## Features

### 🔍 **Comprehensive Account Information**
- **Native Balance**: View your NEAR account's native balance with USD conversion (formatted to exactly 2 decimal places)
- **Staking Data**: Check staked, unstaked, and reward balances from staking pools
- **Lockup Contracts**: Monitor locked amounts and liquid balances for lockup accounts
- **Historical Comparison**: Track reward changes by comparing current data with previous epochs
- **Token Balances**: Display USDT and USDC balances for staking accounts

### 💰 **Real-time USD Conversion**
- Live NEAR price fetching from Binance API
- USD value display for all balance types with consistent 2-decimal formatting
- Formatted currency display with proper localization

### 📊 **Advanced Staking Insights**
- Staking pool information and withdrawal status
- Epoch-based reward tracking with visual progress indicators
- Historical reward comparison with positive/negative indicators
- Current epoch progress with visual progress bar

### 🔧 **Technical Features**
- **Intelligent Account Detection**: Automatically detects lockup contracts and staking pools
- **Dynamic Epoch Length**: Fetches current epoch length from protocol configuration (currently 43,200 blocks ≈ 12 hours)
- **Failover RPC Setup**: Multiple endpoints for maximum reliability
- **Precise Calculations**: BigInt-based calculations for exact balance precision
- **Official NEAR SDK**: Uses `@near-js/tokens` for native formatting and conversions
- **Clean Architecture**: Modular component structure with focused render functions

## Installation

1. Install [Raycast](https://raycast.com/) on your macOS or Windows device
2. Install the NEAR Rewards extension from the [Raycast Store](https://raycast.com/store)
3. Launch the extension using `cmd + space` and search for "Near Rewards"

## Usage

### Two Usage Modes

#### **Auto-Detection Mode** (Recommended)
1. **Launch Extension**: Open Raycast and search for "Near Rewards"
2. **Enter Account ID**: Input any NEAR account ID (e.g., `alice.near`, `bf44d3aea9d6406d68e7888a435771822e974313.lockup.near`)
3. **Automatic Detection**: Extension automatically detects:
   - Regular accounts → Shows native balance only
   - Lockup contracts → Shows native, liquid, locked amounts, and staking info
   - Staking delegation → Displays complete staking information

#### **Explicit Staking Pool Mode** (Advanced)
1. Provide both account ID and specific staking pool
2. Forces full data collection including token balances (USDT/USDC)
3. Useful for complex staking setups or troubleshooting

### Display Information

- **Native Balance**: Account's actual NEAR balance (always shown, formatted to 2 decimals)
- **Liquid Balance**: Unlocked funds in lockup contracts (shown only if > 0)
- **Staked/Unstaked Balances**: Delegation information with USD values
- **Rewards Tracking**: Current epoch rewards with +/- indicators
- **Token Balances**: USDT/USDC holdings for advanced accounts
- **Epoch Progress**: Visual progress bar showing epoch completion (based on dynamic epoch length from protocol config)
- **Protocol Information**: Current block height, epoch start height, and real-time epoch progress

### Account Types Supported

- **Regular Accounts**: Standard NEAR accounts with native balance
- **Lockup Contracts**: Accounts with locked funds and staking delegation
- **Staking Pool Accounts**: Validator pool accounts with delegation info

## API Reference

### Core Classes

#### `NearRewardsClient`
Main client for interacting with NEAR blockchain:

```typescript
// Initialize client with failover RPC providers
const client = new NearRewardsClient();

// Get native balance at specific block
const balance = await client.getNativeBalance(accountId, blockHeight);

// Check if account is a contract
const isContract = await client.isContract(accountId);

// Get lockup contract information with block height
const lockedAmount = await client.getLockedAmount(accountId, blockHeight);
const liquidBalance = await client.getLiquidOwnersBalance(accountId);

// Get current epoch length from protocol configuration
const epochLength = await client.getEpochLength();
```

#### `NearRewardsService`
Service layer for comprehensive data collection:

```typescript
// Collect account data at specific block
const accountData = await service.collectAccountData(accountId, blockHeight, stakingPool?);

// Get complete account rewards with historical comparison
const rewardsData = await service.getAccountRewardsData(accountId, stakingPool?);
```

### Utility Functions

#### Balance Formatting (New Approach)
```typescript
// Get formatted NEAR amount with USD value
const { amount, amountUSD } = getNearAmount(yoctoBalance, nearPrice);

// Format USD values with consistent decimals
const usdValue = formatUSD(nearAmount, nearPrice);

// Use official NEAR SDK for precise formatting
const formatted = NEAR.toDecimal(amount, 2); // Always 2 decimals
```

#### Price & Epoch Information
```typescript
// Get current NEAR price
const price = await fetchNearPrice();

// Get dynamic epoch length from protocol config
const epochLength = await client.getEpochLength();

// Calculate epoch progress
const progress = calculateCurrentPositionInEpoch(epochStart, currentHeight);
```

## Technical Architecture

### Dependencies
- **@near-js/accounts**: Account management and balance queries
- **@near-js/providers**: RPC provider with failover support
- **@near-js/tokens**: Official NEAR token utilities for precise formatting (`NEAR.toDecimal`)
- **@near-js/types**: TypeScript type definitions for blockchain data
- **@raycast/api**: Raycast extension framework

### Key Improvements
- **Precise Formatting**: All NEAR amounts displayed with exactly 2 decimal places
- **Official SDK Integration**: Uses `NEAR.toDecimal()` for consistent formatting
- **Block-Height Queries**: All balance queries require specific block heights for accuracy
- **Modular UI**: Render functions separated for better maintainability
- **Smart Conditionals**: Sections only appear when relevant (e.g., liquid balance only if > 0)

### RPC Endpoints
The extension uses multiple RPC endpoints for reliability:
- `https://free.rpc.fastnear.com` (Primary)
- `https://rpc.mainnet.near.org` (Fallback)
- `https://1rpc.io/near` (Fallback)
- `https://near.lava.build` (Fallback)

### Error Handling
- Graceful handling of contract method calls on regular accounts
- Automatic fallback between RPC providers
- User-friendly error messages for invalid accounts

### Epoch Management
The extension dynamically fetches epoch configuration from the NEAR Protocol:

- **Dynamic Epoch Length**: Uses the `provider.experimental_protocolConfig()` method to get current epoch length
- **Protocol Accuracy**: Both testnet and mainnet use 43,200 blocks per epoch (≈12 hours)
- **Real-time Progress**: Calculates exact epoch progress based on current block height vs epoch start
- **Documentation**: See [NEAR Epoch Documentation](https://docs.near.org/protocol/network/epoch) for details

The epoch length is fetched using the provider method:
```typescript
const result = await this.provider.experimental_protocolConfig({ finality: "final" });
const epochLength = result.epoch_length;
```

This ensures the extension adapts to any future protocol changes in epoch duration.

## Development

### Prerequisites
- Node.js 22+
- TypeScript
- Raycast CLI

### Setup
```bash
# Clone the repository
git clone git@github.com:shelegdmitriy/near_rewards.raycast.git
cd near_rewards.raycast

# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Lint and format
npm run lint
npm run fix-lint
```

### Project Structure
```
src/
├── near-api-client.ts      # Core NEAR blockchain client with utility functions
├── rewards-service.ts      # Service layer for data collection and reward calculations
├── DetailedAccountView.tsx # Main UI component with modular render functions
├── near-rewards.tsx        # Entry point and account input interface
└── types.ts               # TypeScript interfaces using official NEAR types
```

### Code Architecture Highlights

#### **Modular UI Components**
The `DetailedAccountView` is organized into focused render functions:
- `renderBalanceSection()` - Native and liquid balances
- `renderTokenSection()` - USDT/USDC token balances
- `renderEpochSection()` - Blockchain and epoch information
- `renderMarketSection()` - NEAR price information
- `renderStakingSection()` - Staking pool and delegation data
- `renderRewardsSection()` - Reward tracking and historical comparison
- `renderLockupSection()` - Lockup contract information

#### **Data Flow**
1. **Auto-Detection**: Service automatically detects account type and capabilities
2. **Block-Height Consistency**: All queries use specific block heights for temporal accuracy
3. **Pre-calculated Formatting**: Reward differences calculated during data fetch, not render
4. **Conditional Display**: UI sections only render when data is available and relevant

## Recent Updates & Improvements

### 🎯 **Precision & Formatting**
- **Exact 2-Decimal Display**: All NEAR amounts now show exactly 2 decimal places (e.g., `46.14 NEAR` instead of `46.1400000001 NEAR`)
- **Official SDK Integration**: Migrated from custom formatting to `NEAR.toDecimal()` for consistency
- **USD Formatting**: Consistent currency formatting with proper locale support

### 🏗️ **Architecture Improvements**
- **Modular UI Structure**: Extracted 7 focused render functions for better maintainability
- **Simplified Logic**: Two clear paths - auto-detection vs explicit staking pool mode
- **Pre-calculated Data**: Reward differences calculated during fetch, not during render
- **Block-Height Accuracy**: All balance queries now require specific block heights

### 🔧 **API Enhancements**
- **Dynamic Epoch Detection**: Uses `provider.experimental_protocolConfig()` method to fetch current epoch length
- **Required Parameters**: `getNativeBalance()` now requires `blockHeight` parameter for accuracy
- **Lockup Support**: Enhanced `getLockedAmount()` with block-height support
- **Pool Queries**: `getAccountInPool()` supports historical block queries
- **Smart Conditionals**: Liquid balance only shown when actually available (> 0)

### 📊 **Data Accuracy Fixes**
- **Balance Precision**: Fixed discrepancies like showing correct `3.50 NEAR` instead of `0.04 NEAR` for lockup accounts
- **Conditional Rendering**: Sections only appear when relevant data exists
- **Error Handling**: Improved contract detection to prevent "Cannot find contract code" errors

---

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Contact: [dmytro_sheleh](https://raycast.com/dmytro_sheleh)

## Acknowledgments

- Inspired by the original [near_rewards](https://github.com/khorolets/near_rewards) package by @khorolets
- Built with [NEAR JavaScript SDK](https://github.com/near/near-api-js)
- Powered by [Raycast](https://raycast.com/)
- Price data from [Binance API](https://binance-docs.github.io/apidocs/)
