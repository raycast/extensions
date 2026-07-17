# Bitcoin Block Explorer

A Raycast extension to look up Bitcoin mainnet blocks by height. Enter a block number and instantly see the block hash, exact mined date and time, relative age, and Unix timestamp — with a single click to open the block on mempool.space or copy any value.

## Motives

Block explorers are essential tools for Bitcoin developers, researchers, and enthusiasts. But switching context to a browser, typing a URL, and waiting for a full block explorer page to load is slow. This extension brings the same data directly into Raycast — type a height, see the result in under a second.

The Mempool.space API is used instead of blockchain.info because it returns only the block header (no transactions), keeping responses tiny and fast.

## Instructions

### Prerequisites

- [Raycast](https://raycast.com) installed
- Node.js 18+

### Setup

```bash
cd bitcoin-block-explorer
npm install
npm run dev
```

Raycast will open a development window. Invoke "Look up Block" from the root search.

### Usage

1. Open Raycast and run **Look up Block**
2. Enter a Bitcoin mainnet block height (e.g. `680000` or `661,632`)
3. View the block details:
   - Block hash
   - Exact mined date and time
   - Relative age (e.g. "2 years ago")
   - Unix timestamp
4. Use the action panel to:
   - Open the block on mempool.space
   - Copy the Unix timestamp
   - Copy the formatted date
   - Copy the block hash
   - Copy the block height

## Project Structure

```
bitcoin-block-explorer/
  assets/
    icon.png             512×512 extension icon
  src/
    index.tsx            Raycast command entry point — UI component only
    api.ts               Network layer — fetches block data from Mempool.space
    types.ts             Shared TypeScript interfaces (MempoolBlock)
    utils.ts             Pure helper functions (relativeAge, formatDate)
  package.json           Extension manifest, dependencies, scripts
  tsconfig.json          TypeScript configuration
  .eslintrc.json         ESLint configuration
  .gitignore
```

Each file has a single responsibility:
- **`api.ts`** — no Raycast dependency; testable in isolation with any HTTP client
- **`utils.ts`** — pure functions with no side effects
- **`types.ts`** — shared types used by both `api.ts` and `index.tsx`
- **`index.tsx`** — only handles rendering and user interaction

## API

This extension uses the public [Mempool.space API](https://mempool.space/docs/api/rest). No API key is required.

Two sequential requests are made per lookup:
1. `GET /api/block-height/{height}` — returns the block hash as plain text
2. `GET /api/block/{hash}` — returns the block header as JSON

Rate limiting is generous and sufficient for interactive use.

## License

MIT