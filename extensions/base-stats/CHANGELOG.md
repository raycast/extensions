# Base Stats Changelog

## [1.1.0] - 2024-12-19

### Changed
- Migrated from BaseScan API to Etherscan v2 API with chain ID 8453 for Base
- Updated API endpoint to use `https://api.etherscan.io/v2/api?chainid=8453`
- Updated API key source to https://etherscan.io/apidashboard

### Breaking Changes
- Users need to obtain a new API key from Etherscan (https://etherscan.io/apidashboard) as BaseScan API keys are no longer supported

## [Initial Version] - 2024-11-11