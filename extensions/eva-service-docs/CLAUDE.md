# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Raycast extension for searching EVA (New Black e-commerce platform) documentation. Provides three search commands:
- **find-service**: Search EVA services with API reference docs from GitHub
- **find-setting**: Search EVA settings with metadata
- **find-app-setting**: Search EVA app settings

## Commands

### Development
```bash
npm run dev          # Start development mode with hot reload
npm run build        # Build extension for production
npm run lint         # Run ESLint
npm run fix-lint     # Auto-fix linting issues
npm run publish      # Publish extension to Raycast
```

## Architecture

### Data Flow
All commands follow same pattern:
1. Fetch data from EVA API via POST to `${env.endpoint}/message/{ServiceName}`
2. Use `useFrecencySorting` hook to track/sort by user visit frequency
3. Display List → Detail views with metadata

### Key Files
- **defaults.ts**: EVA endpoint + auth token config
- **types/core.ts**: TypeScript definitions for EVA API responses
- **utils.ts**: `transformDefaultValue()` for displaying default values
- **find-service.tsx**: Main service search + API reference docs integration

### Service Documentation (find-service.tsx)
Fetches service info from EVA API, then loads detailed API docs from:
```
https://raw.githubusercontent.com/new-black/eva-apispec/main/output/apidocs/eva/services/{ServiceName}.json
```

Zod schema (`apiRefDocSchema`) validates API doc structure with:
- Request/response samples (JSON/CURL)
- Type definitions with nested properties
- Headers, deprecation notices, authentication

Navigation hierarchy: Service List → Detail → API Ref Docs → Request/Response Types/Samples/Headers

### Authentication
All EVA requests use headers from `getEVAHeaders()`:
```typescript
{
  "eva-user-agent": "Raycast",
  "authorization": env.token
}
```

### Frecency Sorting
Uses `@raycast/utils` `useFrecencySorting` to rank items by frequency + recency of visits. Call `visitItem()` on all user interactions (detail view, copy, browser open).
