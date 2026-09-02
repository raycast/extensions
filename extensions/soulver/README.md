# Soulver Raycast Extension

Solve math, currency conversions, and natural language equations using the Soulver CLI on macOS. Integrate your Soulver sheetbooks directly with Raycast AI.

## Prerequisites

This extension requires the **Soulver CLI** (`soulver`) to be installed on your Mac.

Please refer to the official [Soulver CLI GitHub Repository](https://github.com/soulverteam/Soulver-CLI) for up-to-date installation instructions (via Homebrew, direct downloads, or via the Soulver Mac app).

---

## Features

### 1. Solve Expression Command
Evaluates mathematical expressions, financial calculations, unit conversions, and date math.
- Pass an expression as an argument directly in Raycast.
- If no argument is provided, evaluates the current clipboard contents.
- Automatically copies the answer to your clipboard and displays a HUD notification.

### 2. Raycast AI Tools
Empowers Raycast AI (in Quick AI, AI Chat, and AI Commands) to interact with your Soulver sheetbooks:
- **Solve Expression** (`solve`): Evaluates math, financial, currency, date, and unit conversions.
- **Sheet Management**:
  - `list-sheets`: Lists all sheets in your active sheetbook.
  - `create-sheet`: Creates a new sheet in the sheetbook.
  - `delete-sheet`: Deletes a sheet (prompts for confirmation).
  - `duplicate-sheet`: Duplicates an existing sheet (prompts for confirmation).
  - `move-sheet`: Moves a sheet to a folder (prompts for confirmation).
  - `pin-sheet`: Pins or unpins a sheet.
  - `archive-sheet`: Archives a sheet.
- **Line Operations**:
  - `read-sheet`: Reads all lines and evaluated answers from a sheet.
  - `append-line`: Appends expressions or notes to a sheet (prompts for confirmation).
  - `insert-line`: Inserts a line at a specific 1-based index (prompts for confirmation).
  - `update-line`: Modifies line content at a specific index (prompts for confirmation).
  - `delete-line`: Deletes a line from a sheet (prompts for confirmation).
  - `mark-line`: Marks line behavior (subtotal, running-total, running-budget, timepoint, expression).
  - `inspect-line`: Inspects detailed JSON metadata of a line.
- **Variables & Definitions**:
  - `manage-variables`: Lists, sets, or deletes global sheetbook variables.
  - `manage-definitions`: Shows or appends custom definitions and unit rules.
- **Search & Export**:
  - `search-sheets`: Searches expressions, text, or numbers across sheets.
  - `export-sheet`: Exports sheets to TXT, CSV, HTML, or PNG format or copies to clipboard.
