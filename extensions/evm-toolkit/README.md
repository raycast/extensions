# EVM Toolkit

A [Raycast](https://raycast.com) extension for EVM power users. Copy an address, transaction hash, or block number into your clipboard and instantly open block explorers, read contract source code, check portfolio balances, look up wallet analytics, or simulate transactions across 24+ networks. The **Open Commands** hub is the recommended entrypoint: pin it once and launch any tool in the extension from a single searchable list.

## Commands

### Open Commands

Opens a searchable list of every command in the extension, grouped by purpose (Explore, Intel, Profiles, Tools, Reference). This is the recommended entrypoint if you'd rather pin one command than a handful.

1. Pin or favorite **Open Commands** in Raycast
2. Trigger it and pick any command from the list
3. Commands with a network selection open a form with an input field pre-filled from your clipboard (when it matches the expected format) and a network dropdown defaulting to your preferred network
4. Commands without a network selection launch directly and read from your clipboard as usual

The hub does not replace the individual commands. Every command is still available at the Raycast root. You can disable the ones you don't want in the root search via Extension preferences and keep the hub as your single entrypoint.

### Open Explorer

Opens the block explorer page for whatever is in your clipboard.

1. Copy an address, tx hash, or block number
2. Trigger **Open Explorer** in Raycast
3. Optionally pick a network (defaults to your preferred network)
4. Press Enter

The extension detects what you copied based on its format:

| Format                   | Detected as      |
| ------------------------ | ---------------- |
| `0x` + 40 hex characters | Address          |
| `0x` + 64 hex characters | Transaction hash |
| Digits only              | Block number     |

### Open Code

Opens a smart contract's source code in a web IDE via [deth.net](https://etherscan.deth.net/).

1. Copy a contract address
2. Trigger **Open Code** in Raycast
3. Optionally pick a network (defaults to your preferred network)
4. Press Enter

Only addresses are accepted (tx hashes and block numbers are rejected). Available on networks supported by deth.net: Mainnet, Base, Arbitrum, Polygon, Optimism, BSC, Avalanche, Gnosis, Blast, Sonic.

### Open DeBank Profile

Opens an address's portfolio page on [DeBank](https://debank.com/).

1. Copy an address
2. Trigger **Open DeBank Profile** in Raycast
3. Press Enter

Only addresses are accepted. Network-agnostic: DeBank covers all EVM chains automatically.

### Open Zerion Profile

Opens an address's portfolio page on [Zerion](https://zerion.io/).

1. Copy an address
2. Trigger **Open Zerion Profile** in Raycast
3. Press Enter

Only addresses are accepted. Network-agnostic: Zerion covers all EVM chains automatically.

### Open Arkham Intel

Opens an address's blockchain analytics on [Arkham Intel](https://intel.arkm.com/).

1. Copy an address
2. Trigger **Open Arkham Intel** in Raycast
3. Press Enter

Only addresses are accepted. Network-agnostic: Arkham covers all EVM chains automatically.

### Open MetaSleuth Intel

Opens an address's fund flow analysis on [MetaSleuth](https://metasleuth.io/).

1. Copy an address
2. Trigger **Open MetaSleuth Intel** in Raycast
3. Optionally pick a network (defaults to Mainnet)
4. Press Enter

Only addresses are accepted. Supported networks: Mainnet, BSC, Arbitrum, Polygon, Optimism, Base, Linea, Avalanche, Mantle.

### Open Bubblemaps Intel

Opens a token's holder visualization on [Bubblemaps](https://bubblemaps.io/).

1. Copy a token contract address
2. Trigger **Open Bubblemaps Intel** in Raycast
3. Optionally pick a network (defaults to Mainnet)
4. Press Enter

Only addresses are accepted. Supported networks: Mainnet, Base, BSC, Polygon, Avalanche.

### Open EIP

Opens an [Ethereum Improvement Proposal](https://eips.ethereum.org/) page by its number.

1. Trigger **Open EIP** in Raycast
2. Enter the EIP number (1 to 5 digits)
3. Press Enter

The EIP number is used to open `https://eips.ethereum.org/EIPS/eip-{number}` directly in your browser.

### Open Editor

Opens a GitHub repository or file in a web IDE via [github.dev](https://github.dev/).

1. Copy a GitHub URL (e.g. `https://github.com/owner/repo`)
2. Trigger **Open Editor** in Raycast
3. Press Enter

Only GitHub URLs (`https://github.com/...`) are accepted. The extension replaces `github.com` with `github.dev` and opens the result in your browser. Works with any GitHub path: repositories, files, branches, pull requests, etc.

### Simulate Transaction

Opens a prefilled transaction simulation on [Tenderly](https://dashboard.tenderly.co/simulator/new).

1. Copy an address or calldata to your clipboard (optional, used to prefill fields)
2. Trigger **Simulate Transaction** in Raycast
3. Fill or adjust the form fields:
   - **Target Address** (required): the contract being called
   - **Calldata** (required): hex-encoded function call
   - **Network** (required): defaults to your preferred network
   - **From Address** (optional): caller address
   - **Value in wei** (optional): ETH value sent with the call
4. Press Enter

If your clipboard contains an address it prefills the target; if it contains other hex data it prefills the calldata.

## Supported Networks

Mainnet, Base, Arbitrum, Polygon, Optimism, BSC, Linea, Ink, Arbitrum Nova, zkSync, Avalanche, Gnosis, Scroll, Celo, Mantle, Blast, Sonic, Unichain, Flow, World Chain, ApeChain, Abstract, HyperEVM, Mode.

Each network is mapped to its native block explorer. The extension handles explorer-specific URL patterns (e.g., zkSync uses `/batch/` instead of `/block/` for block pages).

## Preferences

**Default Network**: set your preferred network in the extension settings (Raycast > Extensions > EVM Toolkit). Commands that require a network selection will default to it instead of requiring you to pick one each time. Defaults to Mainnet.

## Development

Prerequisites: Node.js 22+, npm, [Raycast](https://raycast.com).

```sh
npm install
npm run dev        # start in development mode (hot-reload in Raycast)
npm run build      # production build
npm run lint       # run eslint
npm run fix-lint   # auto-fix lint issues
```

## License

MIT
