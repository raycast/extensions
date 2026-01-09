# Raycast Text Save Extension

A Raycast extension that allows you to save text to a file with various formats.

## Features

- Save text to files with different formats (txt, log, md, json, csv, xml, html, css, js, py)
- Files are saved with timestamp in the filename
- Default save location: `~/Downloads/raycast-text/`
- Copy file path to clipboard after saving
- Clean and intuitive user interface

## Installation

1. Install the extension from the Raycast Store or build it locally:

   ```bash
   git clone https://github.com/your-repo/text-save.git
   cd text-save
   npm install
   npm run dev
   ```

2. The extension will be available in your Raycast launcher as "Save Text"

## Usage

1. Open Raycast and run the "Save Text" command
2. Enter or paste the text you want to save in the input area
3. Choose the desired file format from the dropdown
4. Click "Save Text" to save the file
5. The file path will be copied to your clipboard automatically

## File Formats

The extension supports saving text in these formats:

- Plain Text (.txt)
- Log File (.log)
- Markdown (.md)
- JSON (.json)
- CSV (.csv)
- XML (.xml)
- HTML (.html)
- CSS (.css)
- JavaScript (.js)
- Python (.py)

## Configuration

Currently the extension saves files to `~/Downloads/raycast-text/` by default. To change this, modify the `saveDir` variable in `src/save-text.tsx`.

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

## License

MIT
