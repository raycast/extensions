# CRUSH.md - Raycast YouTube Summarizer Extension

## Build/Test/Lint Commands
- `npm run build` - Build extension for production
- `npm run dev` - Start development mode with hot reload
- `npm run lint` - Run ESLint checks
- `npm run fix-lint` - Auto-fix ESLint issues
- `npm run publish` - Publish extension to Raycast store

## Code Style Guidelines

### Imports & Organization
- Use named imports from `@raycast/api` (e.g., `import { List, type LaunchProps }`)
- External libraries first, then internal imports
- Group imports: external → components → hooks → utils → constants
- Use `type` keyword for type-only imports

### TypeScript & Types
- Strict TypeScript enabled - all types must be explicit
- Use `type` for object shapes and unions/aliases
- Export types with PascalCase (e.g., `VideoDataTypes`, `RaycastPreferences`)
- Prefer `type` imports for better tree-shaking

### Naming Conventions
- Files: camelCase for utilities, PascalCase for components
- Hooks: `use` prefix (e.g., `useHistory`, `useVideoData`)
- Constants: camelCase in files, UPPER_SNAKE_CASE for exports
- Components: PascalCase with descriptive names

### Error Handling
- Use async/await with proper try/catch blocks
- Handle API failures gracefully with user-friendly messages
- Validate inputs before processing (especially video URLs)

### Raycast Patterns
- Use `LaunchProps` for command arguments and preferences
- Leverage `LocalStorage` for persistence
- Follow Raycast's component patterns (List, Detail, etc.)