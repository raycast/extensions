# Folder Organizer

Automatically organize your files into categorized folders with this powerful Raycast extension. Keep your Downloads folder clean and organize any custom folder effortlessly.

## Features

### 🗂️ Organize Downloads Folder

Quickly sort all files in your Downloads folder into organized categories like Documents, Images, Videos, Audio, and more.

### 📁 Organize Custom Folder

Choose any folder on your system and organize its files into categorized subfolders based on file types.

### ⚙️ Manage File Categories

Customize file organization categories to match your workflow. Add, remove, or modify file type mappings for each category.

### Delete Empty Folders

Choose a folder and recursively delete empty subfolders after reviewing a
confirmation preview.

## How It Works

The extension uses file extensions to categorize files into appropriate folders:

- **Documents**: PDF, DOC, TXT, etc.
- **Images**: JPG, PNG, GIF, etc.
- **Videos**: MP4, AVI, MOV, etc.
- **Audio**: MP3, WAV, FLAC, etc.
- **Archives**: ZIP, RAR, 7Z, etc.
- **And more...**

Each organizer command asks which mode to use:

- **Root Only** organizes files directly inside the selected folder.
- **Full Organization** also collects files from nested folders while leaving
  detected software projects untouched.

## Usage

1. **Organize Downloads**: Use `⌘⇧O` or search for "Organize Downloads Folder"
2. **Organize Custom Folder**: Use `⌘⇧P` or search for "Organize Custom Folder"
3. **Manage Categories**: Use `⌘⇧M` or search for "Manage File Categories"
4. **Delete Empty Folders**: Search for "Delete Empty Folders"

## Requirements

- macOS
- Raycast app

## Development

See [Project Structure](docs/PROJECT_STRUCTURE.md) for the architecture, command
flow, current limitations, and planned recursive organization behavior.

## Safety

- Files are moved, not copied, to avoid duplicates
- Confirmation dialog shows what will be organized before proceeding
- Existing folders are preserved and files are added to them
- Full organization skips projects detected from version-control metadata,
  source folders, dependency folders, and common language/build manifests
- Empty-folder deletion never deletes the selected root, files, or symbolic
  links
- Folders containing only system metadata such as `.DS_Store` are treated as
  empty
- Empty-folder deletion reports unreadable folders and continues cleaning
  accessible folders
