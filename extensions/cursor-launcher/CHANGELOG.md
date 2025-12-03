# Changelog

All notable changes to this extension will be documented in this file.

## [Command Arguments and Improved Navigation] - {PR_MERGE_DATE}

### Added
- Command Arguments: Both "Create Project" and "Open Directory" commands now accept arguments
  - Create Project: Pass project name as argument for instant creation (e.g., `Create Project my-project`)
  - Open Directory: Pass folder name as argument to open directly (e.g., `Open Directory my-folder`)
- Quick Access to Base Directory: Quick Access now shows all folders in your configured base directory
- System Drive Browsing: Browse any drive on your system (C:, D:, E:, etc.) from the folder browser
- Improved Keyboard Shortcuts: 
  - `Enter` - Open folder in Cursor
  - `Ctrl+Enter` - Browse into folder
  - `Backspace` - Go up one directory level

## [Native Folder Browser and UX Improvements] - {PR_MERGE_DATE}

### Added
- **Native Folder Browser**: Replaced Windows file picker with a Raycast-native List-based folder browser
- **Quick Access Directories**: Quick access to folders in base directory
- **Folder Navigation**: Navigate up directories with Backspace, browse into folders with Ctrl+Enter
- **Real-time Form Validation**: Project name validation feedback appears as you type
- **Full Path Preview**: See the complete project path before creating
- **Performance Optimizations**: Cached project type detection to reduce filesystem calls
- **Memoized Project Lists**: Optimized rendering of pinned and unpinned project lists

### Improved
- **Pinned Projects UI**: Pinned projects now appear in a separate section with clear visual distinction
- **Form Layout**: Better visual hierarchy, validation feedback, and helpful descriptions
- **Empty States**: More informative empty states with actionable guidance
- **Error Messages**: Improved error messages with actionable guidance
- **Folder Browser UX**: Better navigation, breadcrumbs, and keyboard shortcuts

### Fixed
- **Reserved Shortcut Error**: Removed reserved `Cmd+Enter` shortcut from Create Project form (Raycast reserves this for form submission)
- **React Import Errors**: Fixed React import issues in open-directory component
- **Type Imports**: Fixed TypeScript type import issues for better type safety

### Changed
- **Open Directory Command**: Now uses a List-based browser instead of Windows file picker
- **Keyboard Shortcuts**: Removed `Cmd+Enter` shortcut from Create Project (use Enter instead)
- **Project Grouping**: Pinned projects are now grouped in a separate section

## [Pin Projects and Enhanced Features] - {PR_MERGE_DATE}

### Added
- **Pin/Favorite Projects**: Pin frequently used projects to keep them at the top of the list
- **Keyboard Shortcuts**: 
  - `Enter` - Open project in Cursor
  - `Cmd+E` - Show in Finder
  - `Cmd+C` - Copy project path
  - `Cmd+P` - Pin/Unpin project
  - `Cmd+R` - Refresh recent projects list
  - `Cmd+Shift+Delete` - Clear all recent projects
- **Copy Path Action**: Quickly copy project path to clipboard
- **Open in Terminal Action**: Open project directory in Windows Terminal, PowerShell, or CMD
- **Enhanced Project Detection**: Better project type detection (Node.js, Python, Go, Rust, Java, PHP, Ruby, Git)
- **Improved Project Icons**: Different icons for different project types
- **Refresh Action**: Manually refresh the recent projects list
- **Better Empty States**: Helpful empty state with quick actions
- **Configurable Max Recent Projects**: Set maximum number of recent projects (default: 20)

### Improved
- Pinned projects appear at the top of the list
- Better visual indicators for pinned projects
- Improved error handling and user feedback
- Enhanced project type detection with more file patterns

## [Initial Release] - {PR_MERGE_DATE}

### Added
- **Create Project**: Create new project folders with custom names
- **Recent Projects**: View and open recently opened projects
- **Open Directory**: Browse and open any directory in Cursor
- Configurable base directory for new projects
- Automatic project tracking
- Windows path validation
- Smart project filtering (removes deleted projects)

