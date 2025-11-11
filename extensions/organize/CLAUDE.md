# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension built entirely in TypeScript/Node.js with React that helps organize files and folders on macOS. The extension provides three commands to organize Downloads, Desktop, and Temp folders by removing duplicates, archiving old files, and categorizing files by type. **All operations can be undone.**

## Architecture

### Pure TypeScript/React Implementation

The extension is implemented entirely in TypeScript with React UI components, with no external dependencies beyond Node.js (which is required for Raycast extensions). This eliminates the need for Python or any other runtime dependencies.

**Key Modules:**

1. **Command Files** (`src/organize-*.tsx`)
   - Three separate React component entry points for each location
   - Display loading states, results, and provide undo actions
   - Use React hooks (useState, useEffect) for state management

2. **Result View Component** (`src/components/ResultView.tsx`)
   - Displays detailed organization summary using Raycast's Detail component
   - Shows statistics for each operation type
   - Provides "Undo All Changes" action button (⌘Z)
   - Allows copying the summary to clipboard (⌘C)

3. **File Utilities** (`src/lib/fileUtils.ts`)
   - Core file system operations
   - MD5 hash calculation for duplicate detection
   - macOS Trash integration using AppleScript
   - Conflict resolution for file moves
   - File size formatting utilities
   - **Integrated with UndoManager for tracking operations**

4. **Organization Logic** (`src/lib/organizer.ts`)
   - Main organization algorithms
   - Duplicate detection (by size, then hash)
   - Large file handling (>1GB threshold)
   - File archiving by age
   - File categorization by extension
   - Folder consolidation
   - **Accepts UndoManager for operation tracking**

5. **Undo Manager** (`src/lib/undoManager.ts`)
   - Tracks all file operations (moves and trash)
   - Provides undo functionality to reverse changes
   - Handles edge cases (files no longer exist, conflicts, etc.)
   - Note: Files moved to Trash cannot be automatically restored

### Extension Commands

The extension defines three separate commands in `package.json`:

1. **Organize Downloads** (`organize-downloads`)
   - Entry point: `src/organize-downloads.tsx`
   - Archives files older than 60 days
   - Organizes ~/Downloads folder
   - Shows results with undo option

2. **Organize Desktop** (`organize-desktop`)
   - Entry point: `src/organize-desktop.tsx`
   - Archives files older than 30 days (shorter threshold for desktop)
   - Organizes ~/Desktop folder
   - Shows results with undo option

3. **Organize Temp Folder** (`organize-temp`)
   - Entry point: `src/organize-temp.tsx`
   - **Different behavior**: Organizes by creation date, not by file type
   - Creates date folders like "11-5th November 2025"
   - No archiving (temp files are meant to be temporary)
   - Organizes ~/Documents/Temp folder
   - Shows results with undo option

All commands use **"view" mode** (not "no-view") and display a detailed results screen with summary statistics and undo capabilities.

## Organization Features

### Common Operations (all commands)

1. **Duplicate Detection**
   - Groups files by size for quick filtering
   - Calculates MD5 hash for exact duplicate detection
   - Keeps oldest file, moves duplicates to Trash
   - Reports space saved
   - **Tracked for undo (but Trash items need manual restoration)**

2. **Large File Handling**
   - Identifies files larger than 1GB
   - Moves to "Large Files" folder
   - Sorts by size (largest first)
   - **Tracked for undo**

3. **File Categorization**
   - Organizes files into category folders by extension
   - 20+ categories (Music, Videos, Images, Documents, etc.)
   - Handles special cases (.app bundles go to Software)
   - Moves uncategorized files to "Misc"
   - **All moves tracked for undo**

4. **Folder Consolidation**
   - Moves loose folders to "Folders" directory
   - Preserves special folders (Archived, Large Files, etc.)
   - Handles .app bundles separately
   - **All moves tracked for undo**

5. **Safety Features**
   - Uses macOS Trash instead of permanent deletion
   - Automatic filename conflict resolution (appends _1, _2, etc.)
   - Preserves oldest file when duplicates found
   - **Comprehensive undo system**

### Undo Functionality

The extension includes a robust undo system:

- **What can be undone:**
  - All file/folder moves can be reversed
  - Files moved to different folders are restored to original locations

- **Limitations:**
  - Files moved to Trash cannot be automatically restored (macOS restriction)
  - If the original file location is occupied, restoration fails
  - If the moved file was deleted/modified after organization, undo may fail

- **User Interface:**
  - Results screen shows undo statistics
  - "Undo All Changes" button available when operations exist
  - Keyboard shortcut: ⌘Z
  - Shows success/failure feedback after undo attempt

### Location-Specific Differences

- **Downloads**:
  - Archives files older than 60 days
  - Organizes by file type into category folders

- **Desktop**:
  - Archives files older than 30 days (keeps desktop cleaner)
  - Organizes by file type into category folders

- **Temp**:
  - **No archiving** (temporary files by nature)
  - **Organizes by creation date** into date-named folders (e.g., "11-5th November 2025")
  - Removes empty date folders automatically
  - Does NOT organize by file type

## Development Commands

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Development mode (live reload in Raycast)
npm run dev

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint

# Publish to Raycast Store
npm run publish
```

## File Categories

The extension recognizes 20+ file categories:

- **Media**: Music, Videos, Images
- **Documents**: PDFs, Documents (Word/Pages), Spreadsheets (Excel/Numbers), Presentations (PowerPoint/Keynote), Text
- **Creative**: Design, Fonts, 3D models
- **Technical**: Code, Data files, Software installers, Archives
- **Other**: Ebooks, Subtitles, Torrents, Misc

## Project Structure

```
organize/
├── src/
│   ├── organize-downloads.tsx  # Downloads command (React component)
│   ├── organize-desktop.tsx    # Desktop command (React component)
│   ├── organize-temp.tsx       # Temp command (React component)
│   ├── components/
│   │   └── ResultView.tsx      # Results display with undo UI
│   └── lib/
│       ├── fileUtils.ts        # File system utilities
│       ├── organizer.ts        # Organization logic
│       └── undoManager.ts      # Undo tracking system
├── scripts/                    # Legacy Python scripts (reference only)
├── package.json                # Extension manifest
└── CLAUDE.md                   # This file
```

## Code Architecture Details

### UndoManager Module

The undo system tracks all operations:

```typescript
interface FileOperation {
  type: "move" | "trash";
  originalPath: string;
  newPath?: string;
  timestamp: number;
}
```

Key methods:
- `recordMove(originalPath, newPath)` - Track a file move
- `recordTrash(originalPath)` - Track a trash operation
- `getOperations()` - Get all tracked operations
- `undoAll()` - Reverse all operations in reverse order
- `clear()` - Clear operation history

### FileUtils Module

Updated to accept optional `UndoManager`:
- `moveToTrash(filePath, undoManager?)` - Safe deletion with tracking
- `moveWithConflictResolution(source, dest, undoManager?)` - Move with tracking
- All other utilities remain unchanged

### Organizer Module

All organization functions accept optional `undoManager` parameter:
- `organizeDownloads(undoManager?)` - Organize Downloads by file type with tracking
- `organizeDesktop(undoManager?)` - Organize Desktop by file type with tracking
- `organizeTemp(undoManager?)` - **Organize Temp by creation date** with tracking (different logic!)
- `organizeDirectory(path, options)` - Generic organizer for Downloads/Desktop (options include undoManager)

Internal functions:
- `findDuplicates(dirPath, undoManager?)` - Find and remove duplicates
- `findLargeFiles(dirPath, undoManager?)` - Find and move large files
- `archiveOldFiles(dirPath, days, undoManager?)` - Archive old files
- `organizeByType(dirPath, undoManager?)` - Categorize files (Downloads/Desktop only)
- `organizeTempByDate(dirPath, undoManager?)` - Organize by date (Temp only)
- `cleanEmptyDateFolders(dirPath)` - Remove empty date folders (Temp only)

### ResultView Component

React component that displays:
- Comprehensive summary with statistics
- Breakdown by operation type (duplicates, archived, large files, etc.)
- Operation counts (moves, trashed)
- Undo button (conditionally shown)
- Copy to clipboard action

Props:
```typescript
interface ResultViewProps {
  result: OrganizationResult;
  location: string;
  undoManager: UndoManager;
}
```

### Result Structure

All organization functions return an `OrganizationResult`:
```typescript
{
  duplicatesRemoved: number;
  filesArchived: number;
  largeFilesMoved: number;
  filesCategorized: number;
  foldersMoved: number;
  spaceSaved: number; // in bytes
}
```

## Important Notes

- Requires macOS (uses AppleScript for Trash operations)
- Requires Node.js (bundled with Raycast)
- No Python or other external dependencies needed
- All file operations are tracked for undo
- Commands use React and display results in Raycast's Detail view
- Undo has limitations for Trash operations (manual restoration required)
- Commands use `.tsx` extensions (not `.ts`) because they contain JSX
- Console output is logged for debugging in Raycast logs

## User Experience Flow

1. User runs command (e.g., "Organize Downloads")
2. Toast shows "Organizing Downloads..."
3. Organization runs with UndoManager tracking all operations
4. Results screen appears with:
   - Summary statistics
   - Breakdown by operation type
   - Undo button (if operations were performed)
5. User can:
   - Press ⌘Z or click "Undo All Changes" to reverse
   - Press ⌘C to copy summary
   - Close the window

## Adding New File Categories

To add a new file category, edit `FILE_CATEGORIES` in `src/lib/organizer.ts`:

```typescript
const FILE_CATEGORIES: Record<string, string[]> = {
  // ... existing categories ...
  "New Category": [".ext1", ".ext2", ".ext3"],
};
```

## Modifying Organization Behavior

Edit the options passed to `organizeDirectory()` in the respective command files:

```typescript
const organizationResult = await organizeDownloads(undoManager);

// Or customize:
const result = await organizeDirectory(path, {
  findDuplicates: true,
  archiveOldFiles: true,
  daysThreshold: 60,
  findLargeFiles: true,
  organizeByType: true,
  undoManager,
});
```

## Testing

To test the extension:
1. Run `npm run dev`
2. Open Raycast
3. Search for "Organize Downloads", "Organize Desktop", or "Organize Temp"
4. Run a command
5. View the results screen with summary
6. Try the undo functionality
7. Check that files are restored correctly
