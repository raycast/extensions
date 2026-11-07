# Parse Logs

A Raycast extension for filtering log files. Search a log for some text or a regular expression, and the matching lines are saved to a new timestamped file for easy reference.

## Features

- **Text or regex search**: Match lines containing some text, or matching a regular expression, with optional case-sensitive matching
- **Pick the log quickly**: Choose from the folder's log files, newest first, or pick any other file
- **Handles large logs**: Files are read line by line, so big logs don't have to fit in memory
- **Line numbers**: Optionally prefix each saved line with its line number in the original log
- **Automatic output**: Matching lines are saved to a new timestamped file
- **Copy options**: Copy the file, its contents, its name or its path

## Configuration

Set these preferences in Raycast:

### Required Settings

- **Default Folder Path**: The folder containing your log files
- **File Extensions**: Comma-separated list of file extensions to include (e.g., `.log, .txt, .out`)

### Optional Settings

- **Default Search Query**: Pre-fill the search field with a common search term
- **Output Folder**: Where to save results. Leave empty to save next to the log file.

## Usage

1. **Open the extension**: Search for "Parse Log File" in Raycast
2. **Enter a search query**: The text to find, or a regular expression
3. **Choose how to match**: Plain text or regular expression, and whether case matters. The checkboxes remember your last choice.
4. **Choose the log file**: The newest file in your folder is selected by default. Pick another from the list, or use "Or Choose a File" for a file anywhere else.
5. **Parse**: Press Enter

The result view shows how many lines matched and how many were scanned, with a preview of the first 500 matches. The saved file always has every match.

## Output

- **Location**: Next to the original log file, or in your Output Folder if you set one. If that folder can't be written to (for example `/var/log`), results go to `~/Downloads` and the result view says so.
- **Naming**: `{original-filename}_parsed_{timestamp}.log`. Files with `_parsed_` in their name are never offered as logs to parse, so results don't get parsed again by accident.
- **Content**: Only the matching lines, optionally prefixed with their line numbers
- When nothing matches, no file is created.

## Actions Available

- **Open File**: Open the results in your default text editor
- **Show in Finder**: Reveal the results file
- **Copy File** (`⌘C`): Copy the results file to the clipboard
- **Copy File Contents** (`⌘⇧C`): Copy the matching lines as text
- **Copy File Name** (`⌘N`): Copy the results file name
- **Copy File Path** (`⌘⇧P`): Copy the full path to the results file

## Example Workflow

1. Your app writes logs to `/var/logs/myapp/` with the extensions `.log` and `.out`
2. Configure the extension with:
   - Default Folder Path: `/var/logs/myapp/`
   - File Extensions: `.log, .out`
   - Output Folder: `~/Documents/log-extracts` (optional)
3. Run the extension, choose "Lines matching a regular expression" and search for `ERROR|timeout`
4. The newest log is selected, and every line containing `ERROR` or `timeout` is saved to a file like `app_parsed_2026-01-15T10-30-45-123Z.log`
5. Use the action panel to open or copy the results

## License

MIT License - see the LICENSE file for details.
