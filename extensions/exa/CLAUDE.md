# CLAUDE.md

## Build Commands
- Development: `npm run dev` or `ray develop`
- Build: `npm run build` or `ray build`
- Lint: `npm run lint` or `ray lint` 
- Fix Lint: `npm run fix-lint` or `ray lint --fix`
- Just shortcuts: `just run` (dev), `just build`

## Extension Overview

The Exa Raycast extension provides a friendly interface to interact with Exa's AI search and question-answering capabilities:

- **Search**: Search the web with Exa's semantic search
- **Similar**: Find web pages similar to a given URL
- **Answers**: Ask questions and get AI-generated answers with citations
- **Open in Browser**: Quickly open Exa search in your browser
- **AI Tools**: Integration with Raycast AI for search, similar, contents, and answers

## Recent Changes

### Extension Merger (March 2025)
- Merged exa and exa-ai extensions into a single unified extension
- Added Raycast AI Tools from exa extension
- Added "Open in Browser" command from exa extension
- Centralized API client with proxy support for API-key-less operation
- Unified extension metadata with official exa_ai ownership

### Recent UI Fixes and Improvements (Feb 2025)
- Fixed keyboard shortcut issues: replaced `cmd+escape` with `cmd+backspace`
- Added ID display in list views for easier troubleshooting
- Enhanced delete functionality with more robust error handling
- Improved date/time handling for proper sorting of searches
- Fixed detail view display in results mode
- Added better navigation between modes

### UI Improvements
- Removed metadata panel from detail views in favor of inline metadata
- Simplified metadata display with better formatting in markdown
- Made the primary action (Enter key) open the source URL instead of just viewing details
- Completely rewrote search.tsx and similar.tsx with proper two-mode navigation
- Added fuzzy search with Fuse.js for filtering results
- Added backspace key navigation to return to search list
- Cleaned up list display to show only essential information

### Consistent Type & UI Naming
- Renamed session types to more descriptive `WebSearch` and `SimilarSearch`
- Consistent view modes across commands: `searches`/`results` instead of mixed terminology
- Better state variable naming for clarity and maintainability
- Simplified UI without overwhelming metadata in list view

### Completely Redesigned Results Pattern
- Two distinct view modes:
  1. Search History Mode: Shows past searches/queries with minimal metadata
  2. Results Mode: Shows all results for a selected search with detail view
- Seamless transitions between modes with intuitive navigation (backspace support)
- Consistent UI patterns across all three commands
- Improved detail views with structured markdown formatting

### Troubleshooting & Debug Features
- Added ID display in list items for easier identification
- Enhanced logging of storage operations
- More robust deletion with multiple fallback strategies
- Better error reporting and user feedback

### Code Patterns
- Consistent metadata display across all commands
- Default actions prioritize external actions (opening URLs)
- Minimalistic, information-dense UI
- Focus on content over metadata
- Better state management with React hooks
- Optimistic UI updates with proper loading states
- Improved error handling and graceful fallbacks

### Documentation
- Updated README to be more concise and direct
- Added clear development instructions
- Simplified feature descriptions

## Architecture

### exa.ts (API Client)
The exa.ts file provides a centralized API client for all commands:

- **Features**:
  - Singleton pattern for consistent API access
  - Automatic proxy support when no API key is provided
  - Used by all commands and AI tools

### src/tools/ (AI Tools)
The tools directory contains implementations for Raycast AI tools:

- **Implementations**:
  - `search.ts`: Perform web search with Exa
  - `find-similar.ts`: Find similar pages to a URL
  - `get-contents.ts`: Retrieve content from a webpage
  - `get-answer.ts`: Get AI-powered answers to questions

### open-in-browser.ts
Simple command to open Exa search directly in the browser:
- Supports opening with or without a query
- Uses no-view mode for quick execution

### answers.tsx (Q&A Command)

The answers.tsx command implements a question-answering interface with the following components:

- **Data Model**:
  - QA objects with id, question, response, metadata, and creation date
  - Stored in LocalStorage with TypeID-based keys  

- **Core Functions**:
  - `askQuestion`: Sends question to Exa API and stores response
  - Filtering by search text
  - Exact match detection to avoid duplicate questions

- **UI Flow**:
  - List view showing historical questions
  - Detail view showing selected answer and sources
  - Press Enter to open source URL (or view details if no sources)
  - Actions to copy answers, open sources, etc.

## Code Style
- **Imports**: Group in order: React, Raycast API, third-party, local components/utils
- **Naming**: PascalCase for components/types, camelCase for functions/variables
- **Components**: Functional components with hooks, props defined as interfaces
- **Types**: Strong typing with interfaces, proper use of generics, strict mode
- **Error Handling**: Handle try-catch at the UI level, show user-friendly messages
- **Structure**: Separate UI rendering from business logic, group related functions
- **Format**: Default Prettier settings, consistent indentation

## Best Practices
- Use Raycast's native APIs for storage, preferences, UI components
- Handle loading/error states appropriately
- Follow React best practices for state management
- Provide user feedback for async operations
- Keep code clean, readable, and DRY
- Design for flexibility, engineer for performance
- Aim for simplicity and ease of understanding