# ChainScope

Decode Ethereum and Solana transactions without leaving Raycast. Copy a tx hash, some calldata, an address, or a Solana signature, open Decode, and it works out what you pasted and shows what it does. No pasting ABIs by hand, no `cast`, no jumping to a block explorer.

## Commands

### Decode

Reads the clipboard when it opens and figures out the input type.

- Transaction hash: fetches the tx, decodes the function call and every event log, and shows status, gas, block, and timestamp. Follows EIP-1967 proxies to the implementation.
- EIP-7702 transactions also list each delegation signed in them, and calls to a delegated wallet decode with the delegate's ABI.
- Calldata (raw hex): same decoding, without the tx lookup.
- Address: checksums it, does an ENS reverse lookup, says whether it's a contract or an EOA, and resolves the proxy implementation. If it's a Gnosis Safe (or Safe-compatible) multisig, it also shows the m-of-n threshold and the full list of signers. An EIP-7702 wallet is labeled Smart Wallet and shows the contract it delegates to.
- ENS name: resolves it to an address.
- Number or short hex: shows unit conversions inline.

You can also type into the search bar to decode something else.

A few more things it handles:

- Nested calls. `multicall(bytes[])`, Safe `execTransaction`, and aggregator routers are expanded so you see the inner calls instead of one long bytes value.
- Safe `multiSend`. The packed batch is unpacked into a table with the operation, target, value, and decoded call for each entry.
- Revert reasons. For a reverted tx it replays the call and decodes `Error(string)`, `Panic(uint256)`, or a custom error. This is best-effort, since public nodes aren't archive nodes and can't always reproduce the failure.
- Detail panel (`⌘D`) with the full typed breakdown.
- Export. Copy as JSON (`⌘⇧J`), or save CSV/JSON to your Downloads folder (`⌘⌥V` / `⌘⌥J`).
- Custom ABI (`⌘⇧A`) for contracts that aren't verified anywhere. Paste a JSON ABI or human-readable signatures.
- Clipboard history (`⌘⇧P`) when the most recent clip isn't decodable.

Chains: any chain `viem` knows about (around 300, including zkSync, Scroll, Zora, Linea, and the testnets). The RPC and explorer are picked automatically. For anything else, add the chain and its RPC in Manage Networks.

Solana: paste a signature or an account address (base58) and Decode switches to the Solana path. It shows status, fee, the SOL and SPL token transfers (from, to, amount), the programs that ran, and the logs, with a Solscan link. Instructions are decoded against the program's on-chain Anchor IDL when one exists (a Jupiter `route`, for example), and fall back to the program id and account list otherwise. Set the cluster and RPC in the extension preferences; the RPC field also works for SVM rollups like Eclipse.

ABI lookup order is Etherscan V2 (only if you've set an API key), then Sourcify, then Blockscout (Ethereum, Optimism, and Sepolia), then the openchain.xyz signature database. No key is needed. Signature-database matches are marked "best guess", since 4-byte selectors collide; the alternatives are listed.

### Convert Units

wei, gwei, ether, hex/decimal, and bytes32 padding, updated as you type.

### Hash & Selector

keccak256 of a string, plus the 4-byte function selector and 32-byte event topic for a signature like `transfer(address,uint256)`.

### Search Explorer

Detects an address, tx hash, or block number and opens it on Etherscan, Basescan, Arbiscan, and the rest.

### Search Tokens

Find tokens by symbol, name, or address, filtered by chain. EVM tokens come from the Uniswap list, Solana tokens from Jupiter's verified search. Each result shows the address or mint, decimals, a verified badge, price, and (for Solana) the mint and freeze-authority status. `⌘D` opens the detail panel.

### Manage Networks

Every network has its own RPC here. Pick a built-in network to use your own RPC, or add as many new networks as you like, each with a network ID, name, RPC URL, and network token, plus an optional explorer and Blockscout URL. Test or remove them, or make one the default.

### Search Chains

Search every supported chain by name or id. Copy the chain id or RPC URL, or open the explorer. Custom chains you've added show up here too.

## Preferences

Everything is optional, so the commands work without any setup. To change something, highlight any ChainScope command, press `⌘K`, and choose Configure Extension.

- EVM Default Chain. One of the common chains. To pick any other chain, press `⌘D` on it in Manage Networks. A default set there wins over this preference.
- Solana. Cluster and RPC. Each cluster has its own public RPC by default. Your own RPC replaces it, and also works for SVM rollups like Eclipse.
- Etherscan key and ABI sources. On/off switches for Sourcify, Blockscout, and the signature database.
- Server URLs. Your own Sourcify, signature database, EVM token list, and Solana token search servers.

Per-network RPCs and your own networks are in **Manage Networks**, because Raycast's preferences page has no repeating rows. They're stored in Raycast's encrypted local storage. Your RPC is used everywhere for that chain, including ENS (Ethereum) and cross-chain lookups. Press `⌘T` to test a connection; it warns you if the RPC serves a different network. If your provider puts an API key in the URL (Alchemy, Infura, and so on), paste the whole URL.

## Privacy

Decoding talks to a few third-party services: your RPCs or the public default RPCs, Etherscan (only if you set a key), Sourcify, Blockscout, and openchain.xyz. The addresses, hashes, and calldata you decode are sent to them. Sources you turn off receive nothing.

To find a transaction or contract on another chain, the address or hash is also sent to the RPCs of the other common chains and your networks. These are public RPCs unless you've set your own, even if you've set an RPC for your default chain. ENS lookups always use Ethereum mainnet.

Search Tokens downloads the Uniswap token list and sends your search text to Jupiter.
