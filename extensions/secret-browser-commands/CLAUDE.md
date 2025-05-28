# Secret Browser Commands

## Commands

- `npm run dev`: Run extension in development mode
- `npm run build`: Build the extension
- `npm run lint`: Run linter
- `npm run fix-lint`: Automatically fix linting issues
- `npm run publish`: Publish extension to Raycast Store

## Code Style

- **Formatting**: Uses Prettier and ESLint with Raycast config
- **Imports**: Group imports: React, Raycast, then local modules
- **Types**: Strict TypeScript with interfaces in `types.ts` or dedicated files
- **Naming**:
  - Components: PascalCase
  - Functions: camelCase
  - Interfaces: PascalCase prefixed with relevant domain
  - Constants: UPPER_SNAKE_CASE for true constants
- **Error handling**: Use non-null assertions (!) sparingly
- **Components**: Keep components focused on a single responsibility
- **Documentation**: Use JSDoc for complex functions
- **File Structure**: Organize by feature/type (components/, types/, utils/)
- **React Patterns**: Use hooks for state, prefer functional components
