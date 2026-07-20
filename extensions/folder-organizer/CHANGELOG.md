# Folder Organizer Changelog

## [Recursive Organization and Empty Folder Cleanup] - 2026-06-22

- Added **Root Only** and **Full Organization** modes for Downloads and custom folders
- Added recursive file organization that collects files from nested folders
- Added software project detection to keep project folders and their contents untouched
- Added **Delete Empty Folders** command with a confirmation preview
- Added support for deleting folders that contain only system metadata such as `.DS_Store`
- Added clear reporting for folders that cannot be scanned because of permissions
- Improved duplicate filename handling and protection for existing category folders and symbolic links
- Improved partial cleanup reporting when folders change or cannot be deleted

## [Initial Release] - 2025-10-02

- **Organize Downloads Folder**: Automatically sort files in Downloads folder into categorized subfolders
- **Organize Custom Folder**: Choose any folder and organize its files by type
- **Manage File Categories**: Configure and customize file organization categories
- **Smart File Detection**: Automatically categorize files based on extensions
- **Safety Features**: Confirmation dialogs and preview of organization before execution
- **Keyboard Shortcuts**: Quick access with customizable shortcuts
