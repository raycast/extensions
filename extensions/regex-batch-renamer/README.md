# Regex Batch Renamer - Raycast Extension

A powerful Raycast extension that allows you to create and manage multiple regex-based file and folder renaming jobs with batch processing capabilities.

## Features

- 🔧 **Multiple Rename Jobs**: Create, edit, and manage multiple regex-based renaming jobs
- 📁 **Batch Processing**: Rename multiple files and folders at once
- 🎯 **Regex Rules**: Use powerful regular expressions with capture groups and flags
- 👁️ **Preview Changes**: See what changes will be made before applying them
- 📋 **Execution History**: Track and review past rename operations
- 🎬 **Predefined Jobs**: Includes useful presets like Slugify, and file cleanup
- ⚡ **Finder Integration**: Works seamlessly with selected files in Finder
- 🔄 **Conflict Resolution**: Automatically handles filename conflicts

## Commands

### 1. Manage Rename Jobs
- Create new regex-based renaming jobs
- Edit existing jobs with multiple rules
- View detailed job information
- Duplicate and delete jobs
- Browse predefined job templates

### 2. Run Rename Job
- Select files/folders in Finder
- Choose a job to execute
- Preview changes before applying
- View execution results and history

### 3. Create New Rename Job
- Quick access to create a new renaming job
- Add multiple regex rules with find/replace patterns
- Set regex flags (g, i, m, etc.)
- Add descriptions for each rule

## Predefined Jobs

### Slugify Filenames
Converts filenames to URL-friendly slugs:
- Converts to lowercase
- Replaces spaces with hyphens
- Removes special characters
- Normalizes multiple hyphens

**Example:** `My Important Document!.pdf` → `my-important-document.pdf`

### Clean Filenames
Removes common unwanted elements:
- Version numbers (v1.0, 2.1.3)
- Copy suffixes ((copy), (copy 1))
- Download numbers ((1), (2))
- Normalizes underscores and spaces

**Example:** `document_v2.1 (copy 3).pdf` → `document.pdf`

## Usage

### Creating a Custom Job

1. **Open "Manage Rename Jobs"**
2. **Press Cmd+N** or select "Create New Job"
3. **Enter job details:**
   - Name: Give your job a descriptive name
   - Description: Optional description of what the job does
4. **Add regex rules:**
   - Find Pattern: Enter a regular expression
   - Replace With: Enter replacement text (use $1, $2 for capture groups)
   - Flags: Set regex flags (g=global, i=case-insensitive, m=multiline)
   - Description: Describe what this rule does
5. **Add multiple rules** using Cmd+Plus
6. **Save the job**

### Running a Job

1. **Select files/folders in Finder**
2. **Open "Run Rename Job"**
3. **Choose a job from the list**
4. **Preview changes** (Cmd+P) to see what will happen
5. **Run the job** to apply changes
6. **View results** and copy the change log to clipboard

## Regex Examples

### Basic Patterns
- `\.` - Matches literal dot
- `\s+` - Matches one or more whitespace characters
- `[0-9]{4}` - Matches exactly 4 digits
- `(.+)` - Captures one or more characters
- `^The (.+)$` - Matches lines starting with "The "

### Replacement Patterns
- `$1` - First capture group
- `$2` - Second capture group
- Empty field - Removes the matched text

### Common Flags
- `g` - Global (replace all occurrences)
- `i` - Case-insensitive
- `m` - Multiline mode

## Tips

- **Test regex patterns** on smaller batches first
- **Use preview** to verify changes before applying
- **Backup important files** before bulk operations
- **Start simple** and add complexity gradually
- **Use capture groups** ($1, $2) to preserve parts of filenames

## Safety Features

- **Conflict resolution**: Automatically adds suffixes for duplicate names
- **Validation**: Validates regex patterns before saving
- **Preview mode**: See changes before applying them
- **Execution history**: Track what was changed and when
- **Error handling**: Graceful handling of permission issues and invalid patterns

## Examples

### Remove Version Numbers
- **Find:** `\s*v?\d+\.\d+(\.\d+)?\s*`
- **Replace:** ` `
- **Description:** Remove version numbers like v1.0, 2.1.3

### Extract Year from Filename
- **Find:** `.*([0-9]{4}).*`
- **Replace:** `($1)`
- **Description:** Keep only the 4-digit year

### Convert Camel Case to Kebab Case
- **Find:** `([a-z])([A-Z])`
- **Replace:** `$1-$2`
- **Flags:** `g`
- **Description:** Convert camelCase to kebab-case

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Linting
```bash
npm run lint
npm run fix-lint
```

## Technical Details

- **Framework**: Raycast API
- **Language**: TypeScript + React
- **Storage**: Local Storage for jobs and execution history
- **File Operations**: Node.js `fs.promises`
- **Regex Engine**: JavaScript RegExp
