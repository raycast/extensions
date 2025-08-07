# Parse Logs

A Raycast extension for parsing and filtering log files. Quickly search through log files to extract lines containing specific search queries, with the results saved to a new timestamped file for easy reference.

## Features

- **Smart Log Parsing**: Search for specific terms across log files in a designated folder
- **Flexible File Selection**: Choose a specific file or automatically use the most recent log file
- **Configurable File Extensions**: Support for multiple file types (.log, .txt, .out, etc.)
- **Automatic Output**: Creates timestamped filtered files with matching lines
- **Multiple Copy Options**: Copy file, contents, name, or path to clipboard

## Configuration

Before using the extension, you'll need to configure these preferences in Raycast:

### Required Settings

- **Default Folder Path**: The directory containing your log files to search through
- **File Extensions**: Comma-separated list of file extensions to include (e.g., `.log, .txt, .out`)

### Optional Settings

- **Default Search Query**: Pre-populate the search field with a common search term

## Usage

1. **Open the Extension**: Search for "Parse Log File" in Raycast
2. **Enter Search Query**: Type the term you want to find in your log files
3. **Select File (Optional)**:
   - Leave empty to automatically use the most recent file matching your configured extensions
   - Or use the file picker to select a specific log file
4. **Execute**: Press Enter or click "Parse Logs"
5. **View Results**: The extension will display:
   - Number of matching lines found
   - Preview of the filtered content
   - Metadata about the original and new files

## Output

The extension creates a new file with the filtered results:

- **Location**: Same directory as the original log file
- **Naming**: `{original-filename}_parsed_{timestamp}.log`
- **Content**: Only lines containing your search query (case-insensitive)

## Actions Available

Once results are displayed, you can:

- **Copy File** (`⌘C`): Copy the entire filtered file to clipboard
- **Copy File Contents** (`⌘⇧C`): Copy just the text content
- **Copy File Name** (`⌘N`): Copy the generated filename
- **Copy File Path** (`⌘⇧P`): Copy the full file path
- **Show in Finder**: Open the folder containing the results
- **Open File**: Open the filtered file in your default text editor
- **Back to Search** (`⌘B`): Return to the search form

## Example Workflow

1. You have log files in `/var/logs/myapp/` with extensions `.log` and `.out`
2. Configure the extension with:
   - Default Folder Path: `/var/logs/myapp/`
   - File Extensions: `.log, .out`
   - Default Search Query: `ERROR` (optional)
3. Run the extension and search for "database connection"
4. The extension finds the most recent log file and extracts all lines containing "database connection"
5. Results are saved to a new file like `app_parsed_2024-01-15T10-30-45-123Z.log`
6. Use the action panel to copy results or open the file

## License

MIT License - see the LICENSE file for details.