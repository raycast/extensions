# Crypto Search Changelog

## [1.1.0] - 2025-08-28

### Added
- Parallel transaction validation across all supported chains
- Format-based Solana transaction detection with base58 validation
- Comprehensive developer documentation (CLAUDE.md)
- Support for long Solana transaction signatures (87-88 characters)

### Improved
- Transaction detection speed with parallel chain checking
- Solana transaction detection reliability with format-based fallback
- Build configuration for proper Raycast extension import
- Error handling with graceful fallbacks for network timeouts


## [Initial Version] - 2025-08-21

### Added
- Initial release of Crypto Search extension
- Search for Solana and EVM addresses
- Search for transaction hashes across multiple chains
- Automatic token detection for addresses
- Support for opening results in GMGN or block explorers
- Optional maker address filter for GMGN URLs
- Configurable default target (GMGN or block explorer)