<p align="center">
  <img src="./media/icon.png" alt="Brazilian Developer Tools" width="150" height="150" />
</p>

# Brazilian Developer Tools for Raycast

This is a Raycast extension that provides Brazilian developer utilities for generating CPF, CNPJ, UUIDs, Nanoid, and other common values right from your command bar.

## Features

- **CPF**: Generate Brazilian individual taxpayer IDs in raw or formatted form (e.g. `123.456.789-09`)
- **CNPJ**: Generate Brazilian company taxpayer IDs in raw or formatted form (e.g. `12.345.678/9012-34`)
- **UUID v4 & v7**: Generate random UUIDs
- **Nanoid**: Generate short, URL-friendly unique IDs
- **Copy to clipboard**: Every generated value is copied to the clipboard and a HUD confirms the action—no API keys or extra setup required

## Requirements

- [Raycast](https://raycast.com/)

No API key or external authentication is required.

## Setup

1. Install the extension from the Raycast Store (or install locally for development).
2. No additional configuration is needed.

## Commands

### Show tools

Access Brazilian developer tools and utilities. Opens a searchable list to find a feature.

From the main list you can open:

- **Generate documents** — Opens the documents generator view
- **Generate IDs** — Opens the IDs generator view

### Generate documents

Generate Brazilian CPF and CNPJ values.

| Option           | Example              | Action                    |
| ---------------- | -------------------- | ------------------------- |
| CPF              | `12345678909`        | Generate CPF (raw)        |
| CPF (formatted)  | `123.456.789-09`     | Generate CPF (formatted)  |
| CNPJ             | `12345678901234`     | Generate CNPJ (raw)       |
| CNPJ (formatted) | `12.345.678/9012-34` | Generate CNPJ (formatted) |

The following actions are available:

- **Copy to Clipboard** — Generates the value and copies it to the clipboard (`⏎`)

### Generate IDs

Generate UUIDs and Nanoid values.

| Option  | Example                                | Action           |
| ------- | -------------------------------------- | ---------------- |
| UUID v4 | `123e4567-e89b-12d3-a456-426614174000` | Generate UUID v4 |
| UUID v7 | (time-based UUID)                      | Generate UUID v7 |
| Nanoid  | `V1StGXR8_Z5jdHi6B-myT`                | Generate Nanoid  |

The following actions are available:

- **Copy to Clipboard** — Generates the ID and copies it to the clipboard (`⏎`)

## Usage

1. Open Raycast (`⌘ + Space` by default) and run **Show tools** (or search for "Brazilian Developer Tools" or "Show tools").
2. Choose **Generate documents** or **Generate IDs**.
3. Select a row and press Enter (or use the primary action). The value is copied to the clipboard and a confirmation appears in the HUD.

## Credits

Developed by [lucascmpus](https://github.com/lucascmpus).
