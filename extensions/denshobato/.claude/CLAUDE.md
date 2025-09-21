# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project is a Raycast extension that helps avoid garbled characters and input errors when using IME. It provides an input form that automatically sends entered text to the focused input field and saves it to the clipboard.

## Development Commands

### Build and Testing
```bash
# Development mode (live reload)
npm run dev

# Production build
npm run build

# Lint check
npm run lint

# Auto-fix lint issues
npm run fix-lint

# Publish to Raycast Store
npm run publish
```

## Architecture

### Main Component Structure

- **src/denshobato.tsx**: Main component
  - Raycast Form UI implementation
  - Text input processing and clipboard operations
  - System input sending via AppleScript

- **src/utils/application.ts**: System operation utilities
  - AppleScript execution functionality
  - Asynchronous system command execution

### Technology Stack

- **Framework**: Raycast API (@raycast/api)
- **Language**: TypeScript
- **UI**: Raycast Form components
- **System Integration**: AppleScript (macOS), System Events API

### Important Implementation Details

1. **Clipboard Management**: Preserves original clipboard content and restores after operation
2. **Input Sending**: Uses `Command+V` paste to send to focused application
3. **Error Handling**: Proper recovery when AppleScript execution fails

### Configuration Files

- **ESLint**: Uses Raycast standard configuration
- **TypeScript**: ES2023 support with React JSX configuration
- **Prettier**: Code formatting configuration

## Development Notes

- Uses macOS-specific functionality (AppleScript), so macOS development environment is required
- Requires Raycast CLI (`ray` command)
- Form input is type-safely managed with `Values` type