# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for WaniKani that allows users to practice Kanji reviews and lessons directly within Raycast.

## Development Commands

```bash
# Development mode - use this to test the extension locally
npm run dev

# Build the extension
npm run build

# Run linting
npm run lint

# Fix linting issues automatically
npm run fix-lint

# Publish to Raycast Store (not npm)
npm run publish
```

## Architecture

The extension is structured as a Raycast extension with two main commands:

1. **Review Command** (`src/review.tsx`) - For practicing Kanji reviews
   - Fetches available reviews from WaniKani API
   - Presents questions for both meaning and reading
   - Tracks incorrect answers and submits results back to the API

2. **Lessons Command** (`src/lessons.tsx`) - For learning new Kanji
   - Shows new kanji/vocabulary with meanings and readings
   - Includes a quiz phase after learning
   - Starts assignments when lessons are completed

### Key Components

- **API Client** (`src/api/client.ts`) - Handles all WaniKani API interactions
- **Type Definitions** (`src/types/wanikani.ts`) - TypeScript interfaces for WaniKani data structures

### API Integration

The extension requires a WaniKani API token (configured in preferences) and uses these main endpoints:
- `/summary` - Get available reviews and lessons
- `/subjects` - Get kanji/vocabulary details
- `/assignments` - Track user progress
- `/reviews` - Submit review results

## Key Technologies

- **Raycast API** (`@raycast/api`) - The main framework for building Raycast extensions
- **TypeScript** - Strict mode enabled with ES2023 target
- **React** - Using React JSX for UI components
- **ESLint** - Using Raycast's ESLint configuration

## Development Notes

- The extension uses CommonJS modules as required by Raycast
- TypeScript is configured with strict mode for type safety
- The `ray` CLI tool is used for development, building, and linting commands

## Development Memories

- When you make changes to typescript app, restart the dev server