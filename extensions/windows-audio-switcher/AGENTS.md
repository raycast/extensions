# Audio Switcher - Agent Guidelines

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the extension for production
- `npm run lint` - Run ESLint to check code quality
- `npm run fix-lint` - Auto-fix linting issues
- No test framework configured in this project

## Code Style Guidelines

- **TypeScript**: Strict mode enabled, ES2023 target, CommonJS modules
- **Imports**: Use named imports from @raycast/api and @raycast/utils
- **Formatting**: Prettier with 120 character line width, double quotes
- **Components**: Functional components with React hooks
- **File Naming**: kebab-case for files (e.g., audio-switcherooo.tsx)
- **Platform**: Windows-specific Raycast extension
- **ESLint**: Uses @raycast/eslint-config for consistent style

## Raycast Extension Specifics

- Commands defined in package.json with view mode
- Use @raycast/api components (List, ActionPanel, etc.)
- Icons from @raycast/api Icon enum
- State management with React hooks

## Extension Commands

- **output-audio-switcher**: Switch between audio output/playback devices
- **input-audio-switcher**: Switch between audio input/recording devices
- **refresh-audio-devices**: Scan and update the list of available audio devices

## Device Management

- Devices are stored in Raycast LocalStorage as "audio-devices"
- Devices are sorted by Index property for consistent ordering
- Each command filters devices by Type (Playback/Recording)
- Default and Communication status shown as accessories
