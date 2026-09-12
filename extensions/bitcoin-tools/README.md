# Bitcoin Tools for Raycast

Bitcoin Tools is a Raycast extension for common BSV key, address, script, transaction, and market-data workflows. All cryptographic operations use [`@bsv/sdk`](https://www.npmjs.com/package/@bsv/sdk).

## Commands

| Command                             | Behavior                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| Copy Address from WIF               | Converts a mainnet or testnet WIF to the matching address and copies it.             |
| Create P2PKH Script                 | Converts a BSV address to an ASM or hexadecimal locking script.                      |
| Create Address from Public Key Hash | Converts a 20-byte hexadecimal hash to a mainnet address.                            |
| Generate BSV Address                | Generates a random mainnet address.                                                  |
| Generate Private Key (WIF)          | Generates a random mainnet WIF.                                                      |
| Generate BIP32 XPUB / XPRIV         | Generates random BIP32 extended keys.                                                |
| Decode Transaction                  | Parses raw transaction hex and shows inputs, outputs, scripts, values, and metadata. |
| BSV Price in Menu Bar               | Shows the current USD price and latest available block height.                       |
| View Bitcoin Price                  | Shows current price, 24-hour change, volume, market cap, and block height.           |

Generated values can be inserted into the focused application, copied to the clipboard, or both. Configure this behavior in the extension preferences.

## Security and Data Sources

WIF conversion and all key generation happen locally. Private keys are never sent over the network, written to logs, or inserted into the focused application. Generated WIF and XPRIV values are copied to the clipboard, so treat clipboard contents as sensitive.

Market data comes from CoinPaprika and chain height comes from WhatsOnChain. The menu-bar command stores the last valid response in Raycast's local cache and continues rendering it when either service is temporarily unavailable.

## Development

Raycast Marketplace CI uses npm and `package-lock.json`.

```bash
npm install
npm test
npm run lint
npm run typecheck
npm run build
```

Run `npm run dev` to import and exercise the extension in Raycast. Run `npm run publish` after authenticating with Raycast and GitHub to submit it to the Marketplace review repository.
