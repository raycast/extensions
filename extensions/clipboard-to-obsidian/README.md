# Clipboard to Obsidian

Create Obsidian notes from your clipboard history with ease.

## Features

- Automatically creates notes from the last 2 items in your clipboard history
- Uses the shorter text as the filename (normalized)
- Uses the longer text as the note content
- Adds today's date to the filename
- Opens the note in Obsidian automatically

## Configuration

1. **Obsidian Vault Path**: Set the path to your Obsidian vault
2. **Notes Subfolder**: (Optional) Specify a subfolder within your vault for new notes

## Usage

1. Copy two pieces of text to your clipboard
2. Run the "Create Note from Clipboard" command in Raycast
3. The extension will:
   - Take the last 2 items from your clipboard history
   - Use the shorter one for the filename
   - Use the longer one for the note content
   - Create the note in your Obsidian vault
   - Open the note in Obsidian

## Installation

```bash
npm install
npm run dev
```

To publish to the Raycast store:
```bash
npm run publish
```