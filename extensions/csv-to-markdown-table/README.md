# CSV to Markdown Table

Convert between CSV/TSV and Markdown table formats instantly using your clipboard.

## Features

- **Bidirectional conversion**: Convert CSV/TSV to Markdown tables and vice versa
- **Automatic format detection**: Automatically detects CSV, TSV, or Markdown table format
- **One-command operation**: Just copy your data and run the command
- **Three conversion commands**:
  - CSV/TSV → Markdown Table
  - Markdown Table → CSV
  - Markdown Table → TSV

## Commands

### Convert CSV to Markdown
Automatically detects CSV or TSV format from your clipboard and converts it to a Markdown table.

### Convert Markdown to CSV
Converts a Markdown table from your clipboard to CSV format.

### Convert Markdown to TSV
Converts a Markdown table from your clipboard to TSV (tab-separated) format.

## How to Use

### CSV/TSV to Markdown
1. Copy CSV or TSV data to your clipboard (e.g., from Excel, Google Sheets, or any text editor)
2. Run the "Convert CSV to Markdown" command in Raycast
3. The converted Markdown table will be copied to your clipboard
4. Paste it wherever you need (GitHub, Notion, documentation, etc.)

### Markdown to CSV/TSV
1. Copy a Markdown table to your clipboard
2. Run "Convert Markdown to CSV" or "Convert Markdown to TSV" command
3. The converted data will be copied to your clipboard
4. Paste it into Excel, Google Sheets, or any spreadsheet application

## Examples

### CSV to Markdown

**Input (CSV):**
```
name,age,city
John,30,Tokyo
Jane,25,Osaka
```

**Output (Markdown):**
```markdown
| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |
```

### Markdown to CSV

**Input (Markdown):**
```markdown
| name | age | city |
| --- | --- | --- |
| John | 30 | Tokyo |
| Jane | 25 | Osaka |
```

**Output (CSV):**
```
name,age,city
John,30,Tokyo
Jane,25,Osaka
```

## Supported Formats

- **CSV**: Comma-separated values
- **TSV**: Tab-separated values
- **Markdown Table**: Standard Markdown table format with pipes and separators