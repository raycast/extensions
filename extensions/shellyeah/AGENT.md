# Agent Guidelines for Shellyeah

## Documentation Reference
- **Raycast Documentation**: Refer to `docs/raycast.md` for comprehensive information about Raycast API, extension development, manifest structure, and best practices.

## Build & Development Commands
- `npm run dev`: Run in development mode (ray develop)
- `npm run build`: Build the extension (ray build)
- `npm run lint`: Run linting checks
- `npm run fix-lint`: Fix linting issues automatically
- `npm run publish`: Publish to Raycast Store

## Code Style Guidelines
- **Formatting**: Uses Prettier with 120 character line width and double quotes
- **TypeScript**: Strict mode enabled, target ES2023
- **ESLint**: Uses Raycast's ESLint configuration
- **React**: Uses React JSX
- **Imports**: Use named imports where possible, group imports by external/internal
- **Naming**: Use camelCase for variables/functions, PascalCase for components/types
- **Error Handling**: Use try/catch blocks for async operations

## Project Structure
- Extension is a Raycast extension that generates CLI commands from natural language
- Commands are defined in package.json under the "commands" section