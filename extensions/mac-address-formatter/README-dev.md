# MAC Address Formatter

Raycast extension for converting MAC addresses between common formats.

## Features

- Normalizes input by removing all non-hex characters
- Validates that the normalized MAC address is exactly 12 hexadecimal characters
- Converts to one of four output formats:
  - Colon-separated
  - Hyphen-separated
  - Dot-separated
  - No separators
- Lets the user copy the converted result from the Raycast result screen

## Commands

- `MAC to Colon`
- `MAC to Hyphen`
- `MAC to Dot`
- `MAC to Plain`

## Requirements

- Raycast on macOS
- Node.js `22.14` or newer
- npm `7` or newer

## Development

Install dependencies:

```bash
npm install
```

Start Raycast development mode:

```bash
npm run dev
```

Validate the extension:

```bash
npm run lint
npm run build
```

## Usage

1. Open Raycast.
2. Search for one of the MAC formatter commands.
3. Paste or type a MAC address into the command argument field.
4. Press `Enter` to open the result screen.
5. Press `Enter` again on `Copy Result` to copy the converted MAC address and return Raycast to the root search.

If the normalized input is not exactly 12 hexadecimal characters long, the extension displays `Invalid MAC address`.

## Project Structure

- `package.json`: Raycast manifest and npm scripts
- `src/mac-address-command.tsx`: shared validation and formatting logic
- `src/convert-to-colon-separated.tsx`: colon output command
- `src/convert-to-hyphen-separated.tsx`: hyphen output command
- `src/convert-to-dot-separated.tsx`: dot output command
- `src/convert-to-no-separators.tsx`: plain output command
- `assets/icon.png`: extension icon
