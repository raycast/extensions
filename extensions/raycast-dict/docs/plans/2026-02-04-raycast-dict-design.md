# Raycast Dictionary Extension Design

## Overview

A Raycast extension that looks up word definitions using macOS installed dictionaries. Provides real-time word completions and definitions as the user types, with auto language detection and support for all installed system dictionaries.

## Architecture

Two components:

### 1. Swift CLI Helper (`dict-helper`)

Compiled binary bundled in `assets/`. Three commands:

- `dict-helper define <word1> [word2 ...]` - Batch definitions from all (or specified) dictionaries. Returns JSON.
- `dict-helper complete <prefix>` - Word completions via `NSSpellChecker`. Returns JSON array.
- `dict-helper list` - Lists installed dictionaries (id + display name). Returns JSON.

Output format is always JSON for Node.js parsing.

### 2. Raycast Extension (TypeScript/React)

Single command activated via Raycast with prefix. Uses `List` with `isShowingDetail`:

- Left panel: word candidates with dictionary matches
- Right panel: rendered definition from selected dictionary
- Search bar dropdown: filter by dictionary or "All Dictionaries"

## Data Flow

1. User types a word in Raycast search bar
2. Extension calls `dict-helper complete <prefix>` to get word candidates
3. Extension calls `dict-helper define <word1> <word2> ...` in batch for all candidates
4. Character-set heuristic filters which dictionaries to query (Cyrillic -> Russian, CJK -> Chinese/Japanese/Korean, Latin -> all Latin-script dicts)
5. List renders candidates that have definitions; selecting one shows definition in detail panel
6. Calls are debounced/throttled for performance

## Language Detection

Character-set heuristic + implicit dictionary detection:

- Detect script from input characters (Latin, Cyrillic, CJK, Arabic, etc.)
- For non-Latin scripts, only query matching dictionaries
- For Latin scripts, query all Latin-script dictionaries and show whichever return results
- The dictionaries themselves act as the final "detector"

## UI Components

### List View (Left Panel)
- Section 1: "Definitions" - words with dictionary matches, one item per word
- Section 2: "Suggestions" - remaining word candidates without definitions yet
- Words with no definition in any dictionary are filtered out

### Detail Panel (Right)
- Shows definition from the selected dictionary
- Rendered as markdown

### Search Bar
- `List.Dropdown` to filter by specific dictionary or "All Dictionaries"
- Auto-detected from installed dictionaries

### Actions & Shortcuts
- Enter: copy definition to clipboard
- Cmd+Enter: open word in Dictionary.app (`open dict://word`)
- Cmd+Shift+C: copy word itself
- Cmd+D: toggle between dictionaries for same word

## Preferences

- Auto-detect installed dictionaries on first run via `dict-helper list`
- Dictionary filter via search bar dropdown (no manual preferences needed)

## File Structure

```
raycast-dict/
├── package.json          # Manifest with command config
├── tsconfig.json
├── assets/
│   └── dict-helper       # Compiled Swift binary
├── swift/
│   └── DictHelper.swift  # Swift source
└── src/
    ├── index.tsx          # Main command: List + Detail view
    ├── dict-helper.ts     # Wrapper to invoke Swift binary
    └── language-detect.ts # Character-set heuristic
```
