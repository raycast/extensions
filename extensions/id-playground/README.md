# Test Identifiers Generator & Validator

A Raycast extension that generates (and validates) various test identifiers for testing purposes:

- **IMEI** (International Mobile Equipment Identity) - 15-digit mobile device identifier
- **ICCID** (Integrated Circuit Card Identifier) - 19-20 digit SIM card identifier
- **MSISDN** (Mobile Station International Subscriber Directory Number) - Phone number format
- **UUID** (Universally Unique Identifier) - Version 4 UUID
- **MAC Address** - Network interface hardware address
- **IP Address** -

## Features

- Generate all identifiers at once
- Copy individual identifiers to clipboard
- Regenerate specific identifiers
- Regenerate all identifiers
- Search through identifiers

## Installation

1. Clone or download this extension
2. Open Raycast and go to Extensions
3. Click "Import Extension" and select this directory
4. Or run `npm install` and `npm run dev` to develop

## Usage

1. Open Raycast
2. Type "Generate Test Identifiers" or use the command shortcut
3. Browse the generated identifiers
4. Press Enter to copy an identifier to clipboard
5. Use the action panel to regenerate individual or all identifiers

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## License

MIT
