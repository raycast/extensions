# Development Guidelines

## Getting Started

### Prerequisites

- Node.js 16 or later
- npm 7 or later
- Raycast 1.50.0 or later
- MuteDeck desktop app

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/chadrwalters/mutedeck-raycast-extension.git
   cd mutedeck-raycast-extension
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
mutedeck-raycast-extension/
├── src/                # Source code
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript types
│   └── commands/      # Raycast commands
├── assets/            # Icons and images
│   ├── commands/      # Command icons
│   └── screenshots/   # Store screenshots
├── docs/             # Documentation
└── scripts/          # Build scripts
```

## Code Quality

### Standards

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Husky for pre-commit hooks

### Commands

- Keep command files focused and minimal
- Use shared utilities for common operations
- Handle errors gracefully with user feedback
- Follow Raycast's UX guidelines

### Testing

1. Manual Testing

   - Test all commands
   - Verify error handling
   - Check UI/UX consistency

2. Integration Testing
   - Test with MuteDeck app
   - Verify API interactions
   - Check state management

## Build Process

### Development

1. Run development server:

   ```bash
   npm run dev
   ```

2. Make changes and test
3. Verify linting:
   ```bash
   npm run lint
   ```

### Production

1. Build extension:

   ```bash
   npm run build
   ```

2. Test production build
3. Create release PR

## Release Process

1. Update version in package.json
2. Update changelog
3. Create release PR
4. After approval:
   - Merge to main
   - Tag release
   - Submit to Raycast store

## Documentation

- Keep README.md updated
- Document all commands
- Update changelog
- Maintain contributing guide

## Best Practices

### Code Style

- Follow TypeScript best practices
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### Error Handling

- Provide clear error messages
- Handle edge cases gracefully
- Show appropriate UI feedback
- Log errors for debugging

### State Management

- Use React hooks appropriately
- Minimize global state
- Handle side effects properly
- Clean up resources

### Performance

- Optimize API calls
- Minimize re-renders
- Use memoization when needed
- Profile performance regularly

## Troubleshooting

### Common Issues

1. Build Errors

   - Check Node.js version
   - Clear npm cache
   - Reinstall dependencies

2. Runtime Errors

   - Check console logs
   - Verify API endpoints
   - Test with clean state

3. UI Issues
   - Verify icon paths
   - Check command metadata
   - Test in different themes

## Resources

- [Raycast Extensions Guide](https://developers.raycast.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [ESLint Rules](https://eslint.org/docs/rules)

## Icon Requirements

### Icon Specifications

- Format: PNG
- Location: Place in `assets` directory
- Size: Square dimensions (recommended 512x512 pixels)
- Background: Transparent
- Style: Clear, simple design that works in both light/dark modes

### Required Icons

1. Main Extension Icon

   - Filename: `command-icon.png`
   - Used for: Extension listing and identification

2. Command Icons
   - Show Status: `info.png`
   - Toggle Microphone: `microphone.png`
   - Toggle Video: `camera.png`
   - Leave Meeting: `door.png`

### Icon Setup

1. Place all icons directly in the `assets` directory
2. Reference in package.json using just the filename:
   ```json
   "icon": "command-icon.png",
   "commands": [
     {
       "icon": "info.png"
     }
   ]
   ```
3. Ensure each icon is a unique file (not copies of the same image)
4. Clear Raycast's cache after icon changes:
   ```bash
   rm -rf ~/Library/Caches/com.raycast.macos
   ```
5. Restart Raycast for changes to take effect
