# Alby Changelog

## [Fixes] - 2026-02-17

- Renamed "Recent Transactions" command to "Transactions".
- Updated Transactions command icon to PNG format for CI icon validation.
- Removed incompatible flat ESLint config to use the existing ESLint 8 setup.
- Fixed Cashu redeem import path to unblock extension build output.

## [Features] - 2025-01-26

- Added Support for creating invoices in fiat.
- Added Support for sending zaps via lightning address in fiat
- Added support for cashu tokens with all units

## [Features] - 2025-01-12

- Removed View Balance function - it could be checked in last transactions.
- Modified Last Transactions function - now user can see details.
- Added Cashu Tokens and LNURL redeeming support in Redeem function.
- Code cleanup.
- Dependency updates.
- Added Inline Command Parameters for Send and Redeem commands.

## [Dependency Updates] - 2024-05-17

- Fixed bug handling lightning addresses with no custom key/value records

## [Initial Version] - 2023-12-22
