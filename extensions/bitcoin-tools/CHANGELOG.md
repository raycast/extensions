# Bitcoin Tools Changelog

## [Release Preparation] - {PR_MERGE_DATE}

- Migrated all Bitcoin functionality to `@bsv/sdk` 2.x.
- Added fast WIF-to-address conversion with mainnet and testnet support.
- Rebuilt the menu-bar price command with validated responses, timeouts, retries, and last-known-good caching.
- Replaced retired market endpoints and removed the broken historical chart dependency.
- Added a complete raw transaction decoder.
- Updated the Raycast API, development dependencies, Store metadata, and npm lockfile.
- Added automated tests and Biome formatting and linting.

## [Initial Version] - 2024-02-07

- Added the initial Bitcoin utility commands.
