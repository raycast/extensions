# Simple Renamer

Rename selected files in Finder with powerful patterns, sequential numbering, date formatting, and more.

![Extension Icon](extension-icon.png)

## Features

- **7 Renaming Modes**: From simple replacements to complex regex and sequential numbering.
- **Unified Tokens**: Use `$name` (original filename) and `##` (numbering) across modes.
- **Safety First**:
    - **Collision Warning**: Warns if multiple files resolve to the same name or overwrite existing files.
    - **Preview**: See exactly what will happen before you run it.
    - **No Recursive**: Renaming is safe and scoped to your selection.
- **Cross-Platform Logic**: Robust path handling for maximum compatibility.

## Usage

1. **Select files** in Finder.
2. Open Raycast and run **Rename Files**.
3. Choose your **Mode** and configure options.
4. Review the **Preview** and **Warnings**.
5. Press **Cmd+R** to rename!

## Renaming Modes

### 1. Find & Replace
Replace specific text within filenames.
- **Find**: Word or Regex to search for.
- **Replace**: New text (supports tokens like `##` and `$name`).
- *Tip*: Leave "Find" empty to replace the entire filename.

### 2. Sequential Numbers
Add sequential numbering to your files.
- **Position**: Append (Suffix), Prepend (Prefix), or Custom Template.
- **Start Number**: Choose where the count begins.
- **Format**: `_##` becomes `_01`, `_02`, etc.

### 3. Add Prefix/Suffix
Simple way to add text to the start or end of filenames.
- **Prefix**: Added before the name (e.g. `Draft_`).
- **Suffix**: Added after the name (e.g. `_Final`).

### 4. Change Case
Standardize capitalization.
- Options: `lowercase`, `UPPERCASE`, `Title Case`, `camelCase`, `PascalCase`, `snake_case`, `kebab-case`.

### 5. Remove Characters
Trim unwanted characters.
- **Remove First N**: Delete characters from the start.
- **Remove Last N**: Delete characters from the end.

### 6. Add Date
Stamp files with time information.
- **Date Type**: Created, Modified, or Today.
- **Format**: Standard `YYYY-MM-DD` patterns.
- **Position**: Prefix or Suffix.

### 7. Overwrite (Template)
Advanced mode for total control using a pattern template.
- Example: `Image_##_$name`

## Tokens

Use these tokens in "Find & Replace" or "Overwrite" modes:

| Token | Description | Example |
| :--- | :--- | :--- |
| `$name` | Original filename (no extension) | `MyFile` |
| `##` | Number (2 digits) | `01`, `02`... |
| `###` | Number (3 digits) | `001`, `002`... |

## Requirements

- macOS with Finder
- Files must be selected in Finder *before* running the command.
