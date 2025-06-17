# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for the Motion task management platform. The extension allows users to manage Motion tasks directly from Raycast's command palette interface without switching to the Motion web application.

## Development Commands

- `npm run dev` - Start development mode with live reload
- `npm run build` - Build the extension for distribution
- `npm run lint` - Lint code using Raycast's ESLint configuration
- `npm run fix-lint` - Auto-fix linting issues
- `npm run publish` - Publish extension to Raycast Store

## Architecture

### Core Structure
- Each `.tsx` file in `/src/` represents a Raycast command
- `motion-api.ts` provides the centralized Motion API client with full TypeScript types
- Commands follow Raycast's pattern: export default function with proper metadata

### Key Commands
- `capture-motion-task.tsx` - Form-based task creation with validation
- `search-tasks.tsx` - Task search with advanced filtering
- `search-project.tsx` - Project browsing with metadata
- `quick-task-status.tsx` - Rapid task status updates with keyboard shortcuts
- `list-workspaces-projects.tsx` - Configuration utility for setup

### Motion API Integration
- Authentication via API key stored in Raycast preferences
- 5-minute caching for workspaces and projects to reduce API calls
- Comprehensive TypeScript interfaces for all Motion entities
- Error handling with detailed logging and user-friendly messages

### Development Patterns
- Use `@raycast/api` hooks like `useCachedState`, `useLocalStorage` for state management
- Follow Raycast's form validation patterns with `Form.ValidationError`
- Implement keyboard shortcuts using Raycast's `Action` components
- Use `showToast` for user feedback and error reporting
- Leverage `useCachedPromise` for API calls with automatic caching

### Configuration
- User preferences defined in package.json under `preferences`
- Default workspace, project, priority, and duration settings
- API key configuration through Raycast's secure preferences system

### Testing and Quality
- TypeScript strict mode enabled with ES2023 target
- ESLint using `@raycast/eslint-config` for consistent code style
- No test framework currently configured - tests should be added manually if needed

## Important Notes

- All API calls should go through the `motion-api.ts` client for consistency
- Use the existing TypeScript interfaces for Motion entities rather than creating new ones
- Follow Raycast's UI patterns for consistency with other extensions
- Cache API responses appropriately to avoid hitting rate limits
- Handle errors gracefully with user-friendly toast notifications