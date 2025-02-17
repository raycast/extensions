# Changelog

All notable changes to the "Raycast Solana Wallets Generator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-02-17

### Added
- Initial release of the Solana Wallets Generator extension
- Bulk wallet generation capability with customizable count
- Option to include public keys in the output
- CSV format export functionality
- One-click copying for individual wallet keys
- Performance metrics display for generation time
- Clean and intuitive user interface
- Base58 encoding for private and public keys
- Secure wallet generation using @solana/web3.js

### Security
- Implemented secure key generation using Solana's official web3.js library
- Added warning messages about private key security
- Ensured all cryptographic operations are performed locally