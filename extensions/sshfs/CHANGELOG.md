# SSHFS Changelog

## [2025-06-29 08:36:48] Multi-language Support Implementation

- Implemented comprehensive multi-language support for Korean and English
- Added new `LanguageSetting.tsx` component for language selection interface
  - Visual language selection with country flags (🇰🇷 Korean, 🇺🇸 English)
  - Current language indicated with checkmark (✅)
  - Immediate UI update upon language change
- Integrated language persistence using LocalStorage
  - Language preference saved across sessions
  - Automatic language loading on application startup
- Applied internationalization to all UI components
  - All text elements now support language switching
  - Component props extended with language parameter
  - Toast messages displayed in selected language
- Enhanced user experience with language-specific messaging
  - Error messages adapted to selected language
  - Menu items and descriptions localized
- Related files: src/sshfs.tsx (language state management), src/components/LanguageSetting.tsx (new), all component files (language prop integration)

## [2025-06-28 17:28:31] Dynamic System Command Discovery Implementation

- Enhanced the system to dynamically discover command paths rather than using hardcoded paths
- Added src/utils/commands.ts utility module with comprehensive command discovery functionality
  - findCommand: Dynamic command location using which command or common path exploration
  - runCommand: Dynamic command execution capability
  - runPipeline: Pipeline command execution support
  - Command path caching for performance optimization
- Supports diverse environments including Intel and Apple Silicon Mac systems with Homebrew installations
- Applied dynamic discovery to all system commands: mount, umount, diskutil, sshfs, ps, kill, ls operations
- Enhanced error handling provides clear error messages when commands cannot be located
- Related files: src/utils/commands.ts (new), src/sshfs.tsx, src/utils/mount.ts, src/utils/zombie.ts

## [2025-06-28 17:10:07] Improved grep Exit Code Error Handling

- Resolved issues with grep returning exit code 1 when no FUSE or macFUSE mounts are present
- Enhanced loadActiveMounts and getMountTableMounts functions by adding "|| true"
- Improved handling ensures empty mount lists are processed correctly as normal states
- Prevents treating normal "no mounts" scenarios as error conditions
- Related files: src/sshfs.tsx, src/utils/zombie.ts

## [2025-06-28 14:15:35] Mount Command Path Resolution

- Addressed mount command discovery issues in Raycast environment
- Implemented absolute path usage for mount command (/sbin/mount)
- Modified loadActiveMounts function: "mount" → "/sbin/mount"
- Updated getMountTableMounts function accordingly
- Resolved "command not found" errors caused by PATH limitations in macOS environment
- Related files: src/sshfs.tsx, src/utils/zombie.ts

## [2025-06-28 14:25:00] Code Modularization and Refactoring

- Comprehensively restructured src/sshfs.tsx by separating all functionality into dedicated modules
- Extracted type definitions to src/types.ts
- Organized utility functions into src/utils/ directory:
  - exec.ts: Asynchronous command execution utilities
  - mount.ts: Mount and unmount related functions
  - zombie.ts: Zombie mount detection and cleanup functions
- Reorganized components into src/components/ directory:
  - MountPointList.tsx: Saved mount point listings
  - ActiveMountList.tsx: Active mount displays
  - ZombieMountList.tsx: Problematic mount listings
  - CreateMountPoint.tsx: New mount point creation forms
  - InstallationGuide.tsx: SSHFS installation guidance
- Refactored main Command component for improved conciseness
- Enhanced code structure for better maintainability
- Applied ESLint and Prettier formatting standards throughout
- Related files: src/sshfs.tsx, src/types.ts, src/utils/*, src/components/*

## [2025-06-28 13:47:55] Enhanced Zombie Mount Detection Logic and Debug Implementation

- Improved detectZombieMounts function zombie mount detection logic
- Transitioned from df -h based detection to actual filesystem access testing
- Implemented direct mount point accessibility verification using ls command
- Prevented misclassification of healthy mounts as zombies
- Added comprehensive debugging output to loadActiveMounts function
- Included console.log statements for mount command output parsing verification
- Modified grep pattern to 'fuse|macfuse' for enhanced macFUSE support
- Improved UI text: "좀비 마운트" → "문제 있는 마운트"
- Related files: src/sshfs.tsx (enhanced zombie detection logic and debugging)

## [2025-06-28 13:27:28] macFUSE Mount Output Parsing Logic Enhancement

- Enhanced mount output parsing logic in loadActiveMounts and getMountTableMounts functions
- Implemented regex-based parsing with pattern: `/^(.+) on (.+) \(([^,]+)/`
- Accurate handling of macFUSE output format "device on mountpoint (type, options...)"
- Maintained existing space-splitting method as fallback for backward compatibility
- Added filtering for invalid mount entries
- Resolved "no active mounts" display issues
- Related files: src/sshfs.tsx (improved mount output parsing logic)

## [2025-06-28 13:06:56] Duplicate Mount Prevention Feature Implementation

- Introduced checkIfAlreadyMounted function to verify existing mount status
- Implemented duplicate mount prevention logic in mountSSHFS function
- Added user confirmation dialog for existing mounts:
  - Options: "unmount and remount" or "cancel"
- Developed automatic unmount and remount functionality
- Resolved "mount point is itself on a macFUSE volume" errors
- Enhanced user-friendly mount state management
- Related files: src/sshfs.tsx (duplicate mount prevention logic)

## [2025-06-28 12:51:26] SSH Password Authentication and Path Resolution

- Enhanced MountPoint interface with optional password field
- Implemented password input functionality using Form.PasswordField component
- Resolved PATH issues using absolute SSHFS path (/opt/homebrew/bin/sshfs)
- Implemented password authentication logic using password_stdin option with echo pipe methodology
- Developed comprehensive error messaging for authentication failures:
  - SSH authentication failures (permission denied, authentication failed)
  - Connection failures (no route to host, connection refused)
  - Path errors (no such file or directory)
  - SSHFS installation issues (command not found)
- Implemented secure password handling to prevent password exposure in logs
- Related files: src/sshfs.tsx (password authentication), package.json (Title Case corrections)

## [Initial Version] - {PR_MERGE_DATE}