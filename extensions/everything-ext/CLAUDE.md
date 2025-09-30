# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for Windows that integrates with Everything CLI (`es.exe`) to provide fast file search capabilities. The extension allows users to search their entire file system using Everything's powerful indexing engine directly from Raycast.

## Development Commands

- `npm run dev` - Start development mode with hot reload (adds extension to Raycast)
- `npm run build` - Build the extension for distribution (`ray build -e dist`)
- `npm run lint` - Run ESLint to check code quality (`ray lint`)  
- `npm run fix-lint` - Automatically fix linting issues (`ray lint --fix`)
- `npm run publish` - Publish extension to Raycast store (`ray publish`)

## Architecture

### Core Components

- **Main Search Component** (`src/search-file.tsx`): The primary React component that handles file searching, preview, and actions
- **Everything CLI Integration**: Uses Windows `es.exe` command-line tool for file indexing and search
- **File Preview System**: Intelligent text file detection and preview for supported file types

### Key Technical Details

1. **Search Implementation**: 
   - Uses `es.exe` with CSV output format to get comprehensive file metadata
   - Supports configurable minimum character threshold before triggering search
   - Handles UTF-8 encoding with `chcp 65001` for proper Windows character support

2. **File Type Detection**:
   - Fast-path detection for known text extensions (`.txt`, `.md`, `.js`, `.ts`, etc.)
   - Binary detection using null-byte analysis for unknown file types
   - Preview limited to files under 10KB for performance

3. **Action System**:
   - Primary action configurable (open file vs. open folder)
   - Run-as-administrator support for `.exe` files
   - Copy file/directory to clipboard functionality
   - Custom file explorer command support

4. **Error Handling**:
   - Graceful handling of missing `es.exe` in PATH
   - Permission elevation prompts for protected executables
   - User-friendly error messages with actionable guidance

### Configuration

The extension uses Raycast's preference system for:
- `esExePath`: Custom path to es.exe executable
- `fileExplorerCommand`: Custom file manager command with `%s` placeholder
- `openFolderAsDefault`: Toggle primary action between file/folder opening
- `minCharsToSearch`: Minimum characters required before search starts

## Dependencies

- `@raycast/api`: Core Raycast extension API
- `@raycast/utils`: Utility functions including `useCachedPromise` for search caching
- Standard Node.js modules: `child_process`, `fs/promises`, `path`

## Development Notes

- Extension is Windows-only due to Everything CLI dependency
- Uses TypeScript with React JSX compilation
- Follows Raycast extension architecture patterns
- File operations use native Windows commands and PowerShell for elevation