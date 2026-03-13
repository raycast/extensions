# Obsidian URL Opener - Architecture & Design

## Overview

A Raycast extension that scans Obsidian vaults for markdown files and provides quick access to URLs stored in frontmatter properties. The extension uses direct file scanning (no database) with intelligent frecency-based sorting.

## Core Architecture

### Design Principles
- **Direct Scanning**: Files are scanned on-demand for fresh data
- **No Database**: Uses Raycast LocalStorage for usage tracking only
- **Frecency Sorting**: Combines frequency and recency for intelligent ordering
- **Performance**: Optimized for instant response with typical vaults

### Key Components

1. **File Scanner** (`services/fileScanner.ts`)
   - Scans vault using glob patterns
   - Extracts URLs from frontmatter
   - Validates and normalizes URLs

2. **Usage Tracker** (`services/usageTracker.ts`)
   - Records note access in LocalStorage
   - Calculates frecency scores
   - Auto-cleans old entries

3. **Note Grouper** (`services/noteGrouper.ts`)
   - Groups multiple URLs per note
   - Applies frecency-based sorting
   - Handles display formatting

4. **Commands** (`commands/*.tsx`)
   - Individual commands per URL type
   - Shared open-link base command
   - Consistent UI and behavior

## Data Flow

1. User invokes command
2. Scanner reads vault files
3. Parser extracts URLs from frontmatter
4. Usage tracker applies frecency scoring
5. Notes grouped and sorted for display
6. User selects URL to open
7. Usage recorded for future sorting

## Frecency Algorithm

Combines recency and frequency for intelligent sorting:
- **Recency**: Exponential decay (7-day half-life)
- **Frequency**: Logarithmic growth (diminishing returns)
- **Buckets**: 6 score levels for stable sorting

## Performance Optimizations

- Parallel file processing
- Efficient glob patterns
- In-memory operations
- OS filesystem caching benefits subsequent runs

## Supported URL Properties

See [Supported URL Properties](supported-properties.md) for the complete list.

## Future Development

See [ROADMAP](../ROADMAP.md) for planned features and enhancements.