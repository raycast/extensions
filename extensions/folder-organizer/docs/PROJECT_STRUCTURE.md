# Project Structure

This document records the extension architecture, current behavior, and planned
direction for recursive folder organization.

## Purpose

Folder Organizer is a Raycast extension that sorts files into category folders
based on file extensions. It supports organizing the user's Downloads folder or
a selected custom folder.

## Directory Map

```text
folder-organizer/
├── assets/                         Command icons and README images
├── metadata/                       Raycast Store screenshots
├── src/
│   ├── clean-downloads-folder.tsx  Organize the user's Downloads folder
│   ├── delete-empty-folders.ts     Delete empty folders under a selected root
│   ├── organize-custom-folder.tsx  Pick and organize a custom folder
│   ├── manage-categories.tsx       Manage category names and extensions
│   └── utils/
│       ├── categories.ts           Category defaults and LocalStorage access
│       ├── empty-folder-cleaner.ts Find and delete empty folders
│       ├── file-organizer.ts       Scan, analyze, categorize, and move files
│       ├── folder-picker.ts         Shared macOS folder picker
│       ├── organization-mode.tsx   Show the organization mode picker
│       └── organization-summary.ts Shared skipped-item message formatting
├── CHANGELOG.md
├── README.md
├── package.json                    Raycast commands, dependencies, and scripts
└── tsconfig.json                   TypeScript configuration
```

## Command Flow

Both organizer commands use the same shared workflow:

```text
Raycast command
  -> show organization mode picker
  -> loadCategories()
  -> categoriesToFileTypes()
  -> determine target folder
  -> analyzeFolder()
  -> show confirmation
  -> organizeFolder()
  -> show result
```

### `src/clean-downloads-folder.tsx`

- Uses `~/Downloads` as the target folder.
- Analyzes files before showing a confirmation dialog.
- Organizes confirmed files using the shared organizer.

### `src/organize-custom-folder.tsx`

- Uses AppleScript to let the user select a target folder.
- Analyzes files before showing a confirmation dialog.
- Organizes confirmed files using the shared organizer.
- Offers to reveal the organized folder in Finder.

### `src/manage-categories.tsx`

- Displays configured categories.
- Supports adding, editing, deleting, and resetting categories.
- Persists category configuration through Raycast `LocalStorage`.

### `src/delete-empty-folders.ts`

- Lets the user select a root folder.
- Recursively analyzes empty subfolders.
- Shows a deletion preview and requires confirmation.
- Deletes empty folders from deepest to shallowest.

## Shared Utilities

### `src/utils/categories.ts`

Responsibilities:

- Defines default categories and their file extensions.
- Loads and saves category configuration.
- Converts the category array into the extension mapping expected by the
  organizer.
- Always adds the `★ Other` fallback category.

### `src/utils/file-organizer.ts`

Responsibilities:

- Finds files eligible for organization.
- Categorizes files based on their extensions.
- Produces analysis counts for the confirmation dialog.
- Creates category folders.
- Moves files and resolves duplicate destination names.

Current internal flow:

```text
getFilesToOrganize()
  -> categorizeFiles()
  -> analyzeFolder() or organizeFolder()
```

### `src/utils/organization-mode.tsx`

- Shows a Raycast view for choosing `Root Only` or `Full Organization`.
- Uses `Enter` for Root Only and `Command + Enter` for Full Organization.
- Treats closing the view as cancellation.

### `src/utils/organization-summary.ts`

- Formats shared project and unreadable-folder summaries for organizer commands.

### `src/utils/empty-folder-cleaner.ts`

- Finds directories that are empty or become empty after deleting empty
  children.
- Never includes the selected root.
- Never follows or deletes symbolic links.
- Treats folders containing only `.DS_Store`, `Thumbs.db`, or `desktop.ini` as
  empty and removes that metadata during confirmed deletion.
- Deletes directories in deepest-first order.
- Continues past unreadable directories and reports their paths and failure
  reasons to the user.
- Reports partial deletion results when a confirmed folder changes or cannot be
  deleted.

### `src/utils/folder-picker.ts`

- Provides the shared AppleScript folder picker used by custom-folder commands.

## Organization Modes

### Root Only

Organizes files directly inside the selected folder. Nested folders and their
contents remain untouched.

### Full Organization

Recursively collects files from nested folders and moves them into category
folders directly under the selected root:

```text
Selected Folder/
├── nested-a/report.pdf
├── nested-b/photos/image.jpg
└── notes.txt

becomes:

Selected Folder/
├── ★ Documents/
│   ├── report.pdf
│   └── notes.txt
└── ★ Pictures/
    └── image.jpg
```

Full organization follows these safety rules:

- Skip system files such as `.DS_Store`, `Thumbs.db`, and `desktop.ini`.
- Do not follow symbolic-link directories.
- Skip root-level category output folders during recursive scanning.
- Skip detected software project folder trees.
- Always scan the selected root while preserving root-level project markers and
  infrastructure folders.
- Preserve existing duplicate-name handling.
- Keep empty source directories.
- Use identical scanning rules for analysis and organization.
- Report scanning or movement failures.

Project detection uses folder-level markers:

- Version-control metadata: `.git`, `.hg`, and `.svn`.
- Dependency and environment folders: `node_modules` and `.venv`.
- Conventional source folders: `src` and `source`.
- Common JavaScript, Python, Rust, Go, Java, .NET, C/C++, Ruby, PHP,
  Elixir, Dart, Swift, and Xcode manifests or project files.

Detected project paths are included in analysis results and shown as a skipped
project count in command messages.

The organizer uses the following internal representation so nested files retain
their source location during movement:

```ts
interface FileToOrganize {
  sourcePath: string;
  fileName: string;
  relativePath: string;
}
```

## Validation Baseline

As of June 10, 2026:

- `npx tsc --noEmit` passes.
- `npx eslint src` passes.
- Prettier checks pass.
- The project has no automated tests.
- `ray lint` requires network access for Raycast metadata validation.
- `ray build` writes generated output outside the repository.
