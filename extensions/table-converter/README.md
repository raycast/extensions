# Table Converter for Raycast

Convert tables from various formats (HTML, CSV, Excel, Spaces) to Markdown and vice versa, directly from Raycast.

## Features

- **Convert to Markdown**: 
  - Supports HTML tables (preserves links, code).
  - Supports CSV, Excel (Tab-delimited).
  - Smart selection (detects columns in space-separated text).
  - Nessus SYN Scanner output support.
  - Options to format headers, trim whitespace, and more.

- **Convert from Markdown**:
  - Convert Markdown tables to CSV, JSON, or HTML.

## Usage

1. **Convert Table to Markdown**:
   - Copy your table (from a website, Excel, or text file).
   - Run the "Convert Table to Markdown" command.
   - Select the format (or let it auto-detect).
   - Adjust options if needed.
   - Copy the result or paste it directly.

2. **Convert Markdown to Table**:
   - Copy a Markdown table.
   - Run the "Convert Markdown to Table" command.
   - Select the target format (CSV, JSON, HTML).
   - Copy or paste the result.

## Formats Supported

- **HTML**: Standard `<table>` tags.
- **CSV**: Comma-separated values.
- **Excel**: Tab-separated values.
- **Smart**: Detects columns in text based on whitespace alignment.
- **Nessus**: Specific parser for Nessus SYN scan results.

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
1. Ensure `package.json` has your correct username and details.
2. Run `npm run publish`.
3. Follow the CLI instructions to authenticate with GitHub and open a Pull Request to the `raycast/extensions` repository.

### Contribute
See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.
