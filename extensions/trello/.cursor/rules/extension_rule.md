# Raycast Extension Development Rules

## 1. Project Structure Requirements

### Required Files
- `package.json` - Extension metadata and dependencies
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration
- `src/` directory - All source code
- `assets/` directory - Icons and other resources

### Recommended Directory Structure
```
extension-name/
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── utils/         # Utility functions and API calls
│   ├── types/         # TypeScript type definitions
│   └── commands/      # Command implementations
├── assets/
│   └── command-icon.png
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── README.md
```

## 2. Package.json Configuration

### Required Fields
- `$schema`: "https://www.raycast.com/schemas/extension.json"
- `name`: Lowercase, no spaces, unique identifier
- `title`: Human-readable name (use nouns, not verbs)
- `description`: Clear, concise explanation of functionality
- `icon`: Path to icon file in assets directory
- `author`: Your Raycast username
- `license`: "MIT"
- `commands`: Array of command objects
- `dependencies`: Must include "@raycast/api"

### Command Configuration
Each command must include:
- `name`: File name (without extension)
- `title`: Follow `<verb> <noun>` structure
- `subtitle`: Extension name
- `description`: Clear functionality description
- `mode`: "view" or "no-view"

### Platform Support
- Always specify `platforms` array: ["macOS", "Windows"] or specific platforms

## 3. TypeScript Configuration

### Required Compiler Options
```json
{
  "compilerOptions": {
    "target": "es2020",
    "lib": ["es2020"],
    "module": "commonjs",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"]
}
```

## 4. ESLint Configuration

### Required Setup
- Use @typescript-eslint/parser for TypeScript
- Include prettier configuration
- Disable unused vars rule if needed
- Configure for Node.js environment

## 5. Code Style Guidelines

### TypeScript/React Best Practices
- Use functional components with hooks
- Implement proper error handling with try-catch
- Use TypeScript interfaces for all data structures
- Implement loading states for async operations
- Use Raycast's Toast API for user feedback

### File Naming
- Use PascalCase for components: `TrelloListItem.tsx`
- Use camelCase for utilities: `fetchTodos.tsx`
- Use kebab-case for assets: `command-icon.png`

### Import Organization
```typescript
// 1. Raycast imports
import { List, showToast, Toast } from "@raycast/api";

// 2. React imports
import { useEffect, useState } from "react";

// 3. Local imports (relative)
import { returnTodos } from "./utils/fetchTodos";
import { TrelloFetchResponse } from "./trelloResponse.model";
```

## 6. API Integration Rules

### Authentication
- Store API keys in preferences, not in code
- Use environment variables for sensitive data during development
- Implement proper error handling for API failures

### API Calls
- Use async/await for all API operations
- Implement proper loading states
- Cache responses when appropriate
- Handle rate limiting gracefully

## 7. UI/UX Guidelines

### List Components
- Always provide loading states
- Implement search/filter functionality
- Use appropriate icons for actions
- Provide keyboard shortcuts when possible

### Form Components
- Validate user input
- Provide clear error messages
- Use appropriate input types
- Implement proper form submission handling

## 8. Testing and Validation

### Before Publishing
1. Run `npm run build` - Ensure no build errors
2. Run `npm run lint` - Fix all linting issues
3. Test all commands manually
4. Verify error handling works correctly
5. Check all preferences work as expected

### Performance Considerations
- Minimize API calls
- Implement proper caching
- Use React.memo for expensive components
- Debounce search inputs

## 9. Security Best Practices

### API Keys and Secrets
- Never commit API keys to version control
- Use Raycast preferences for user-specific credentials
- Implement proper token storage
- Validate all user inputs

### Data Handling
- Sanitize all user inputs
- Validate API responses
- Implement proper error boundaries
- Handle sensitive data carefully

## 10. Publishing Guidelines

### Version Management
- Follow semantic versioning
- Update CHANGELOG.md for each version
- Tag releases appropriately

### Submission Process
1. Ensure all tests pass
2. Update documentation
3. Run `npm run publish`
4. Respond promptly to review feedback
5. Address all reviewer comments

## 11. Maintenance Requirements

### Post-Publication
- Monitor for bug reports
- Update dependencies regularly
- Respond to user feedback
- Maintain compatibility with Raycast updates

### Code Quality
- Keep code DRY (Don't Repeat Yourself)
- Write self-documenting code
- Use meaningful variable names
- Add comments for complex logic

## 12. Specific to This Project (Trello Extension)

### Trello API Integration
- Use proper Trello API endpoints
- Handle rate limiting (Trello has strict limits)
- Implement proper error handling for API failures
- Cache board and list data when possible

### Authentication
- Use Trello's OAuth flow
- Store tokens securely in preferences
- Implement token refresh if needed
- Handle expired tokens gracefully

### Data Models
- Use TypeScript interfaces for all Trello objects
- Implement proper type checking
- Handle optional fields correctly
- Validate API responses against types
