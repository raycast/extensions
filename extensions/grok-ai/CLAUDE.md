# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the extension for production

### Code Quality
- `npm run lint` - Run ESLint to check code quality
- `npm run fix-lint` - Auto-fix linting issues

### Testing
- `npm run test` - Run tests in watch mode
- `npm run test:ci` - Run tests once with coverage
- `npm run test:coverage` - Generate coverage report
- `npm run test:ui` - Run tests with UI interface

### Publishing
- `npm run publish` - Publish to Raycast Store

## Architecture

This is a Raycast extension for integrating xAI's Grok API. The codebase follows a React/TypeScript architecture with custom hooks for state management.

### Core Structure
- **Entry Points**: Three main commands in `src/`: `ask.tsx` (chat), `history.tsx` (conversation history), `model.tsx` (model management)
- **State Management**: Custom hooks in `src/hooks/` handle all state logic, API calls, and caching
- **API Integration**: `useGrokAPI.tsx` manages xAI API communication at `https://api.x.ai/v1`
- **Storage**: Uses Raycast's Cache API with namespace `ac.grok` for persistent data

### Key Patterns
- **Streaming-First**: Supports both streaming and non-streaming responses from Grok API
- **Error Handling**: Comprehensive error handling for rate limits, auth errors, and network issues
- **Type Safety**: All types defined in `src/type.tsx`
- **Component Composition**: Reusable components in `src/actions/` and `src/views/`

### API Configuration
- Default model: `grok-3-mini-fast-beta`
- Authentication via Bearer token from user preferences
- Dynamic model fetching from xAI API at `/v1/models` endpoint
- Automatic fallback to hardcoded models if API fails
- 1-hour cache for fetched models to reduce API calls
- Supports custom model creation and management

### Dependencies
- Raycast API for UI and extension framework
- `uuid` for unique IDs
- `moment` for date handling
- `say` for text-to-speech functionality
- `csv-parse` for import/export features