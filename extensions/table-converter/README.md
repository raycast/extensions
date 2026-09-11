# Universal Table Converter for Raycast

A powerful, all-in-one table conversion tool for Raycast. Convert between Markdown, JSON, CSV, HTML, and Excel (Tab-separated) formats with automatic format detection.

## Features

- **Universal Conversion:** Seamlessly convert between any supported format (e.g., HTML to CSV, JSON to Markdown, Markdown to Excel).
- **Auto-Detection:** Automatically detects the format of the text in your clipboard upon opening the command.
- **JSON Support:** Convert JSON arrays of objects directly into clean Markdown tables.
- **Excel Compatibility:** Convert Markdown tables to Tab-separated values (TSV) for easy pasting into Excel or Google Sheets.
- **Nessus SYN Support:** Specific parser for Nessus SYN scan results.
- **Smart Text Parsing:** Intelligently detects columns in aligned whitespace text.
- **Local & Private:** All processing happens locally on your machine. Your data never leaves your computer.

## Usage

1. **Copy Table Data:** Copy a table from a website, spreadsheet, code editor, or terminal.
2. **Open Universal Table Converter:** Run the command in Raycast.
3. **Format Detection:** The extension will automatically identify the input format.
4. **Choose Target:** Select your desired output format (Markdown, CSV, JSON, HTML, or Excel).
5. **Paste:** Use the "Paste to App" action to immediately insert the result into your active application.

## Supported Formats

- **Markdown:** Standard GitHub-flavored markdown tables.
- **JSON:** Array of objects representing rows.
- **HTML:** Standard `<table>` structures.
- **CSV:** Comma-separated values.
- **Excel (TSV):** Tab-separated values (the standard for clipboard pasting into spreadsheets).
- **Smart Text:** Space-aligned text columns.

## Credits

Based on the [Table2MD](https://github.com/Xre0uS/Table2MD) web tool.

## Publishing & Contributing

### Verify Extension
Before publishing or submitting a PR, ensure the extension builds and passes linting:
```bash
npm run lint
npm run build
```

### Publish to Store
To publish this extension to the Raycast Store:
1. Ensure `package.json` has your correct Raycast username.
2. Run `npm run publish`.
3. Follow the CLI instructions to open a Pull Request to the `raycast/extensions` repository.

### Contribute
See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.