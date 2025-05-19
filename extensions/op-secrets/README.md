# 1Password Secrets - Raycast Extension

A Raycast extension for quickly accessing and copying API keys from 1Password.

## Features

- Search and list all 1Password items tagged with 'cli'
- Quick copy API keys to clipboard with metadata display
- Automatic authentication handling with 1Password CLI
- Secure credential field detection

## Prerequisites

- [1Password CLI](https://developer.1password.com/docs/cli/get-started/) installed and configured
- Raycast installed
- 1Password items tagged with 'cli' label

## Installation

### For Private/Personal Use

1. Clone this repository
2. Run `pnpm install` in the extension directory
3. Run `pnpm run dev` to test locally
4. Run `pnpm run publish` to publish to your organization

### From Raycast Store

(If published publicly) Search for "1Password Secrets" in the Raycast Store

## Usage

1. Open Raycast (Cmd+Space or your configured hotkey)
2. Type "Search 1Password Items" or the configured alias
3. Browse your 1Password items tagged with 'cli'
4. Press Enter to copy the API key to clipboard
5. View item metadata in the details panel

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm run dev

# Run tests
pnpm test

# Build for production
pnpm run build

# Publish extension
pnpm run publish
```

## Testing

The extension includes comprehensive tests using Vitest:

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## Configuration

The extension automatically detects credential fields using common naming patterns:
- credentials, credential
- api key, apikey
- key, secret, token
- password

## Troubleshooting

### 1Password CLI not found
Ensure 1Password CLI is installed: `brew install 1password-cli`

### Authentication issues
The extension will automatically prompt for authentication when needed

### No items found
Make sure your 1Password items are tagged with the 'cli' label

## License

Proprietary - All Rights Reserved