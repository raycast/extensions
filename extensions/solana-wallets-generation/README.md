# Solana Wallets Generation

Introducing the Solana Wallet Generator, a powerful Raycast extension designed for developers and cryptocurrency enthusiasts seeking to efficiently create multiple Solana wallets. This tool streamlines the wallet generation process, allowing users to produce thousands of wallets swiftly and securely.

## Features

- 🚀 Fast wallet generation using Solana Web3.js
- 📋 Generate multiple wallets in one go (default: 10)
- 🔑 Option to include public keys alongside private keys
- 📝 Easy CSV format export
- 📎 One-click copying of individual wallet keys
- ⚡️ Performance metrics showing generation time

## Usage

1. Launch the extension in Raycast
2. Configure the number of wallets you want to generate
3. Toggle whether to include public keys
4. Click "Generate Wallets" or press Enter
5. View the generated wallets in a list
6. Copy individual wallet keys or export all as CSV

## Technical Details

- Built with React and Raycast API
- Uses `@solana/web3.js` for wallet generation
- Implements `bs58` encoding for private keys
- Generates standard Solana keypairs
- Outputs private keys in Base58 format
- Optional public key output in Base58 format

## Security Note

Always store your private keys securely and never share them with anyone. This tool is intended for development and testing purposes.

## Requirements

- Raycast
- Node.js

## Contributing

Feel free to open issues or submit pull requests if you have suggestions for improvements or bug fixes.

## Roadmap

Here are some planned improvements for future releases:

### Version 1.1.0
- [ ] Add preferences for configurable defaults:
  - Default number of wallets to generate
  - Default CSV export format
  - Default inclusion of public keys
- [ ] Add command for viewing wallet generation history
- [ ] Add command for managing saved wallets

### Version 1.2.0
- [ ] Add support for different Solana networks (mainnet, testnet, devnet)
- [ ] Add wallet balance checking functionality
- [ ] Add QR code generation for wallet addresses
- [ ] Add support for custom derivation paths

### Version 1.3.0
- [ ] Add support for different wallet formats (paper wallet, JSON)
- [ ] Add batch operations for saved wallets
- [ ] Add wallet labeling and organization features
- [ ] Add export to different formats (JSON, PDF)

## License

MIT License

Copyright (c) 2024 Uladzislau Kaminski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.