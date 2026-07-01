# Multiscan

Paste any crypto address or transaction hash to instantly detect the chain and open the block explorer.

## Features

- **Auto-detection** — Automatically identifies the blockchain from an address or transaction hash
- **70+ chains** — Bitcoin, Ethereum, Solana, Cosmos ecosystem, Sui, Aptos, Cardano, Polkadot, TON, XRP, Tron, and many more
- **On-chain verification** — Confirms whether an address has activity on each detected chain
- **Name resolution** — Resolves ENS (.eth), SNS (.sol), BNB (.bnb), and other name services
- **Testnet support** — Detects testnet addresses and displays a Testnet badge
- **Customizable explorers** — Override the default block explorer for any chain in preferences

## Usage

1. Open the Multiscan command in Raycast
2. Paste an address, transaction hash, or name (e.g. `vitalik.eth`)
3. Press Enter to open the result in a block explorer

## Privacy

The address, transaction hash, or name you enter is sent to the Multiscan lookup
service ([multiscan.dev](https://multiscan.dev), or your own Worker URL in
preferences) to detect the chain, resolve names, and verify on-chain activity.
Nothing is sent until you type or paste a query.

Clipboard auto-fill is **off by default**. If you enable it in preferences, the
extension reads your clipboard on launch and, when it looks like an address,
looks it up automatically — so only turn it on if you're comfortable with that.

## Powered by

[multiscan.dev](https://multiscan.dev) — the open-source multi-chain lookup engine.
