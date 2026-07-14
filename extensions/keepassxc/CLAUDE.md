# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension that integrates with KeePassXC password manager. It allows users to search and access their KeePass database entries (passwords, usernames, TOTP codes, URLs) directly from Raycast.

## Commands

```bash
npm run dev      # Start development server (ray develop)
npm run build    # Build for production (ray build -e dist)
npm run lint     # Run ESLint
npm run fix-lint # Auto-fix linting issues
```

## Architecture

### Entry Point
- `src/search.tsx` - Main command entry point. Manages database lock state and renders either the unlock form or search interface.

### Components
- `src/components/unlock-database.tsx` - Password/key file form for unlocking the database
- `src/components/search-database.tsx` - Searchable list of database entries with actions (paste/copy password, username, TOTP; open URL)

### Core Utilities
- `src/utils/keepass-loader.ts` - Main class `KeePassLoader` that:
  - Spawns `keepassxc-cli` for database operations
  - Handles credential caching in Raycast LocalStorage
  - Exports and parses CSV entries from the database
  - Locates KeePassXC installation (macOS via `getApplications()`, Windows hardcoded path)

- `src/utils/inactivity-timer.ts` - Manages auto-lock timing by storing last activity timestamp in LocalStorage

- `src/utils/placeholder-processor.ts` - Processes KeePassXC placeholders (`{TITLE}`, `{USERNAME}`, `{PASSWORD}`, `{URL}`, `{NOTES}`, `{TOTP}`) in copied values

- `src/utils/totp.ts` - Generates TOTP codes using the `otpauth` library

### Entry Data Format
Database entries are stored as string arrays with indices:
- `[0]` folder, `[1]` title, `[2]` username, `[3]` password, `[4]` URL, `[5]` notes, `[6]` TOTP URL

### Platform Support
Supports both macOS and Windows. On Windows, assumes KeePassXC is installed at `C:\Program Files\KeePassXC\`.

## Key Dependencies
- `@raycast/api` - Raycast extension API
- `otpauth` - TOTP generation
- `csv-parse` - Parsing KeePassXC CLI CSV export
- `run-applescript` - macOS automation (if needed)
