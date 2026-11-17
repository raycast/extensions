# ChainScope Changelog

## [Initial Version] - 2026-11-13

- Added Decode: reads the clipboard and decodes EVM tx hashes, calldata, addresses, ENS names, and Solana signatures and accounts.
- Added EVM transaction inspection with status, gas, event-log decoding, and EIP-1967 proxy resolution. ABIs come from Etherscan V2 (optional key), then Sourcify, then Blockscout, then the openchain.xyz signature database.
- Added nested-call and Safe `multiSend` expansion, best-effort revert reasons, and Gnosis Safe multisig detection (m-of-n threshold and signers).
- Added EIP-7702 support: delegated wallets, signed delegations in transactions, and decoding with the delegate's ABI.
- Added Solana decoding: parsed transactions, SOL and SPL transfers, programs, logs, and Anchor IDL instruction decoding.
- Added support for any chain viem knows, plus Manage Networks for adding any number of your own networks and RPCs.
- Added JSON and CSV export of decoded results.
- Added the Search Tokens, Search Chains, Convert Units, Hash & Selector, and Manage Networks commands.
