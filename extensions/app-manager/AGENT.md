# Agent Configuration

## Commands
- **Build**: `npm run build`
- **Dev**: `npm run dev`
- **Lint**: `npm run lint`
- **Fix Lint**: `npm run fix-lint`
- **Publish**: `npx @raycast/api@latest publish` (publishes to Raycast Store)

## Architecture
- **Type**: Raycast extension for macOS application management
- **Structure**: Single-command extension with one main view (`src/kick.tsx`)
- **Core Features**: Lists GUI apps via AppleScript, supports multi-selection and batch quitting
- **Dependencies**: @raycast/api, @raycast/utils, React hooks

## Code Style
- **Formatting**: Prettier with 120 char width, double quotes
- **ESLint**: Uses @raycast/eslint-config
- **TypeScript**: Strict mode, ES2023 target, React JSX
- **Naming**: camelCase for variables/functions, PascalCase for components/interfaces
- **Imports**: External libs first, then internal, destructured when possible
- **Error Handling**: Try-catch with user-friendly toast messages, proper error propagation
- **State**: React hooks (useState, useCachedPromise from @raycast/utils)
