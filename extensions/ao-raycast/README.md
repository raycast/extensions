# AO Raycast Extension

This Raycast extension integrates with the AR.IO SDK to make working with Arweave domains (ArNS), transactions, and gateways a breeze. It provides various Raycast commands to fetch and display ArNS records, open transaction data, and explore transactions with ease.

## Features

1. Search and browse Arweave Domains (ArNS):
   - Fetches real-time ArNS records via the AR.IO SDK.
   - Supports searching domains and filtering them quickly.
   - Displays undernames with a dedicated view.

2. Open Data from a Transaction:
   - Takes an Arweave transaction ID and attempts to open the raw data in your browser.
   - Can use "Wayfinder" to pick the best available gateway.

3. Open in Explorer:
   - Takes an Arweave transaction ID and opens it in a customizable explorer view (by default, ao.link).

4. Gateway Health & Performance:
   - Attempts to find the healthiest gateway using built-in caching and metrics.
   - Caches resource availability to shorten load times.

5. Search Arweave Documentation:
   - Search across official Arweave documentation sources
   - Automatic daily indexing of documentation
   - Supports AO Cookbook, Arweave Cookbook, and AR.IO docs
   - Uses the same gateway infrastructure for reliable access

6. Additional Utilities:
   - Copy domain names, transaction IDs, or domain-based gateways directly to your clipboard.

## Requirements

- Raycast installed
- Bun installed on your system (version ≥ 1.0 recommended)  
  (This extension is set up primarily with Bun as the package manager.)

## Getting Started

1. Clone this repository (or download the code).
2. Navigate to the project directory.
3. Install dependencies using Bun:  
   › `bun install`

4. Run in development mode:  
   › `bun run dev`

At this point, you can edit and test the extension in your local Raycast environment.

## Scripts

Below are some commonly used scripts defined in the "scripts" section of package.json:

• <strong>build</strong>: Builds the Raycast extension.  
  › `bun run build`

• <strong>dev</strong>: Runs the Raycast extension in development mode.  
  › `bun run dev`

• <strong>lint</strong>: Lints the project using Raycast's ESLint configuration.  
  › `bun run lint`

• <strong>fix-lint</strong>: Automatically fixes many lint errors.  
  › `bun run fix-lint`

• <strong>publish</strong>: Publishes the extension to the Raycast Store (make sure you're logged in).  
  › `bun run publish`

## Usage

After building or running this extension in Raycast:

• "Arns" Command: Search and browse Arweave Domains.  
• "Open Transaction Data" Command: Quickly open a transaction's data on the best gateway.  
• "Open in Explorer" Command: Open a transaction in your configured explorer (defaults to ao.link).  
• "Arweave Docs" Command: Search through Arweave documentation with automatic daily updates.

You can configure preferences in the Raycast "Extensions" tab to:
- Toggle whether to use the "Wayfinder Protocol" to evaluate gateways automatically.
- Modify default gateway domains and explorer URLs.

## Contributing

We appreciate contributions of any kind:

1. Fork the repository.  
2. Create a new branch for your feature or bug fix.  
3. Make your changes and commit them.  
4. Submit a pull request on the main repository.

## License

This project is licensed under the terms of the MIT license.  
See the [LICENSE](./LICENSE) file for details.
