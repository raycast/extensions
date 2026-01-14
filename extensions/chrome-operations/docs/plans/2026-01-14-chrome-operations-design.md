# Chrome Operations Extension Design

**Date:** 2026-01-14
**Project:** Raycast Extension - Chrome Operations

## Overview

A Raycast extension with two commands for Chrome browser operations:
1. Open current browser page in Google Chrome
2. Open Chrome in Incognito mode (blank window)

## Architecture

### Command Structure

Two independent Raycast commands:

- **open-in-chrome** - Gets current page URL from active browser and opens in Chrome
- **open-chrome-incognito** - Opens Chrome Incognito window (blank)

### File Structure

```
src/
├── utils/
│   └── browser-helpers.ts    # Shared browser utilities
├── open-in-chrome.ts         # Command 1: Open current page in Chrome
└── open-chrome-incognito.ts  # Command 2: Open Chrome Incognito
```

## Implementation Details

### Command 1: open-in-chrome

**Process:**
1. Use AppleScript to get URL from active browser (Safari > Chrome > Edge > Firefox)
2. Validate URL format
3. Execute `open -a "Google Chrome" <url>` via shell
4. Show HUD feedback

**Error Handling:**
- No supported browser active: "No supported browser active"
- Invalid URL: "Invalid URL"
- Chrome not installed: "Google Chrome not found"

### Command 2: open-chrome-incognito

**Process:**
1. Execute `open -na "Google Chrome" --args --incognito`
2. Show HUD feedback

**Error Handling:**
- Chrome not installed: "Google Chrome not found"

### Browser Helpers Module

**Functions:**

```typescript
getActiveBrowserUrl(): Promise<string | null>
openInChrome(url: string): Promise<void>
openChromeIncognito(): Promise<void>
```

**Type Definitions:**

```typescript
type BrowserType = 'safari' | 'chrome' | 'edge' | 'firefox';

interface BrowserInfo {
  name: string;
  processName: string;
  script: string;
}
```

## Data Flow

**open-in-chrome:**
User command → AppleScript get URL → Validate → Open Chrome → HUD feedback

**open-chrome-incognito:**
User command → Open Chrome with --incognito → HUD feedback

## Implementation Plan

1. Create `browser-helpers.ts` utility module
2. Create `open-in-chrome.ts` command
3. Create `open-chrome-incognito.ts` command
4. Update `package.json` commands configuration
5. Test and verify (lint, build, dev)

## Dependencies

- `@raycast/api` - showHUD, etc.
- Node.js `child_process` - shell command execution
- macOS AppleScript - browser communication

## Constraints

- macOS and Windows platforms only
- Requires Google Chrome installed
- Requires Raycast API
