# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

menubar-toggler is a Raycast extension for controlling macOS menu bar auto-hide settings. Uses AppleScript to communicate with System Events to toggle menu bar visibility.

## Commands

```bash
npm run dev      # Start development mode with hot reload
npm run build    # Build the extension
npm run lint     # Check code style
```

## Architecture

- **src/menubar-toggler.tsx**: Main command entry point, controls menu bar via AppleScript
- **assets/icon.png**: Extension icon
- **package.json**: Defines extension metadata, commands, and dependencies

Commands run in `@raycast/api` no-view mode, directly executing operations and outputting status info.

## Tech Stack

- TypeScript + React
- @raycast/api (Raycast extension development framework)
- AppleScript (Controls macOS system settings)
