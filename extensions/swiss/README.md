# Swiss for Raycast

A Raycast extension that wraps the [`swiss`](https://github.com/huseyinbabal/swiss) CLI — encode,
hash, convert and generate, all **100% locally**. Your data never leaves your machine.

## Commands

### Swiss Transform

Type or paste a value (it auto-fills from your selection / clipboard) and Swiss runs every relevant
conversion at once — Base64, hex, hashes, `json → yaml`, JWT decode, slugs, case conversion, IP math,
colors and more. Operations that don't apply to your input are hidden automatically, so you only see
meaningful results. Filter by category, then **Copy** or **Paste** the result.

### Swiss Generate

Generate UUIDs (v4 / v7), passwords and lorem ipsum locally. Hit `⌘R` to regenerate.

## Requirements

The `swiss` CLI must be installed:

```bash
brew tap huseyinbabal/tap
brew install swiss
```

The extension auto-detects `swiss` in the usual Homebrew/PATH locations. If yours lives elsewhere,
set the path in the extension preferences.

## How it works

Each action shells out to `swiss`, piping your input via stdin (`swiss <cmd> -v -`), so there are no
escaping or length limits — and nothing is sent over the network.
