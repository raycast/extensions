# Blockchain Explorer Search Changelog

## [Version 1.0.0] - 2025-01-17

### Added
- **Token Price Display**: Real-time token pricing from Routescan API
  - Show current price with smart decimal formatting (4 decimals for <$1, 2 decimals otherwise)
  - Display 24-hour price change percentage with visual indicators
  - Up/down chevron icons and emojis for price movement

- **Token Saving Feature**: Save token contracts to address book
  - Save tokens using Cmd+S shortcut
  - Edit saved tokens
  - Full integration with Saved Addresses command

- **Enhanced Search**:
  - 3-character minimum search support for token symbols (e.g., "ggp", "eth")
  - Smart caching with 5-minute TTL to respect API rate limits
  - Routescan API integration for cross-chain token discovery

- **Saved Addresses Command**: Complete address and token management
  - View all saved addresses and tokens
  - Edit entries with tags, notes, and chain associations
  - Export as JSON, CSV, or Markdown
  - Search by label, address, or tags
  - Paste address from clipboard (Cmd+Enter)

- **Configure Explorers Command**: Advanced chain configuration
  - Add custom blockchain explorers
  - Configure custom RPC URLs
  - Edit and delete custom chains
  - Copy Chain ID and RPC URL
  - Support for 100+ built-in chains via viem

- **Address Details View**: Comprehensive address information
  - QR code generation
  - Address format variations (checksummed, lowercase, with/without prefix)
  - Chain-specific information
  - Export options (JSON, Markdown, CSV)

- **Search History**: Track recent searches
  - Last 10 searches displayed
  - Quick re-search functionality
  - Clear individual or all history
  - Relative timestamps

### Technical Improvements
- Upgraded to @raycast/api@^1.98.5
- Added viem@^2.37.12 for robust blockchain utilities
- Implemented efficient in-memory caching
- Added TypeScript strict type checking
- Debounced API calls (300ms) to reduce spam

## [Initial Version] - 2022-06-09
- Initial Etherscan extension release
