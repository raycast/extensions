# Base Stats Changelog

## [1.2.0] - 2025-10-15

### Changed
- Fixed ESLint configuration to work with ESLint 8.57.0
- Cleaned up console logging to remove ANSI escape codes in output
- Simplified error handling by removing unnecessary try/catch wrappers
- Updated TypeScript interfaces for better type safety

### Removed
- Removed stats command entirely - extension now focuses solely on gas price monitoring
- Removed all console.log statements for cleaner production code

### Fixed
- Resolved "BaseScanResponse is defined but never used" linting warnings
- Fixed ESLint configuration import errors
- Eliminated "unnecessary try/catch wrapper" linting errors

## [1.1.0] - 2024-12-19

### Changed
- Migrated from BaseScan API to Etherscan v2 API with chain ID 8453 for Base
- Updated API endpoint to use `https://api.etherscan.io/v2/api?chainid=8453`
- Updated API key source to https://etherscan.io/apidashboard

### Breaking Changes
- Users need to obtain a new API key from Etherscan (https://etherscan.io/apidashboard) as BaseScan API keys are no longer supported

## [Initial Version] - 2024-11-11