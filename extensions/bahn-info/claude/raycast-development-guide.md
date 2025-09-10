# Raycast Extension Development Guide

> **TLDR**: Comprehensive reference for developing Raycast extensions covering API components, development workflow, best practices, and implementation patterns. Key focus areas: TypeScript/React setup, UI components (List, Form, Detail), command types, utilities, and environment APIs.

## System Requirements

- **Raycast**: 1.26.0 or higher
- **Node.js**: 22.14 or higher (use nvm for version management)
- **npm**: 7 or higher
- **Prerequisites**: Basic familiarity with React and TypeScript

## Development Setup

### Getting Started
1. Sign in to Raycast to access development commands
2. Use "Create Extension" command to generate new extensions
3. Run `npm install && npm run dev` for hot-reloading development
4. Extensions appear in Raycast's root search during development

### Development Commands
- **Create Extension**: Generate from templates
- **Import Extension**: Import from source code
- **Manage Extensions**: List and edit published extensions
- **Store**: Search and install published extensions

## Core API Structure

### Main Packages
- `@raycast/api`: Core API bundled with Raycast app
- `@raycast/utils`: Additional utilities for common patterns

### Installation
```bash
npm install --save @raycast/utils  # Optional utilities
```

## UI Components

### Primary Components
1. **List**: Display multiple similar items
2. **Grid**: Similar to List with more space for images
3. **Detail**: Present detailed information
4. **Form**: Create new content with input fields

### Component Guidelines
- Set `mode` to `view` in manifest file for UI components
- Export React component from command entry file
- Render content quickly for responsiveness
- Use `isLoading` prop for loading indicators

### ActionPanel and Actions
- **ActionPanel**: Provides interaction options
- **Actions**: Can be associated with keyboard shortcuts
- Common actions: OpenInBrowser, CopyToClipboard, custom actions

## Command Types and Configuration

### Command Modes
1. **view**: Standard UI-based commands
2. **no-view**: Headless commands without UI
3. **menu-bar**: Menu bar extensions

### Manifest Configuration (package.json)
```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "extension-name",
  "title": "Extension Title",
  "description": "Extension description",
  "commands": [
    {
      "name": "command-name",
      "title": "Command Title",
      "mode": "view", // or "no-view"
      "description": "Command description"
    }
  ]
}
```

## Environment API

### Key Properties
- `raycastVersion`: Current Raycast version
- `extensionName`: Current extension name  
- `commandName`: Launched command name
- `isDevelopment`: Development mode indicator
- `appearance`: App appearance (dark/light)
- `launchType`: How command was launched

### Useful Functions
```typescript
import { environment } from "@raycast/api";

// Get selected items from Finder
const selectedItems = await environment.getSelectedFinderItems();

// Get selected text from frontmost app
const selectedText = await environment.getSelectedText();

// Check API accessibility
const canAccess = environment.canAccess();
```

## AI Integration

### AI API Features
- No API keys required (uses Raycast Pro)
- Multiple model support (OpenAI, Anthropic, Perplexity, etc.)
- Customizable creativity levels and model selection

### Usage Example
```typescript
import { AI } from "@raycast/api";

const answer = await AI.ask("Suggest 5 jazz songs", {
  creativity: "medium",
  model: AI.Model["OpenAI_GPT4o"]
});
```

### Creativity Levels
- Range: "none" to "maximum" or numeric 0-2
- Controls response variability

## Utilities Package (@raycast/utils)

### Common Hooks
- `usePromise`: Handle async operations
- `useFetch`: HTTP requests
- `useAI`: AI integration

### Utility Functions  
- `runAppleScript`: Execute AppleScript
- `showFailureToast`: Error notifications
- `getFavicon`: Retrieve website icons
- `getProgressIcon`: Progress indicators

### Form Utilities
- `storeValue`: Persist form selections
- Form validation helpers

## Development Patterns

### Form Implementation Example
```typescript
import { Form, Action, ActionPanel, Toast, showToast } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={(values) => {
              // Handle form submission
              showToast(Toast.Style.Success, "Success!");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" />
      <Form.Dropdown id="expiration" title="Expiration">
        <Form.Dropdown.Item value="1h" title="1 hour" />
        <Form.Dropdown.Item value="1d" title="1 day" />
      </Form.Dropdown>
    </Form>
  );
}
```

### Error Handling
- Use try-catch blocks for async operations
- Show appropriate toast messages
- Validate input before processing

### Performance Best Practices
- Render content quickly
- Use loading states appropriately
- Implement proper error boundaries

## Development Workflow

### Local Development
1. Create extension using Raycast's "Create Extension" command
2. Navigate to extension directory
3. Run `npm install && npm run dev`
4. Test in Raycast with hot-reloading enabled
5. Use developer tools for debugging

### Publishing
1. Use `npm run publish` to publish to Raycast Store
2. Follow Raycast's publishing guidelines
3. Test thoroughly before publishing

## Architecture Considerations

### Project Structure
- Entry points in `src/` directory
- TypeScript configuration in `tsconfig.json`
- Extension manifest in `package.json`
- Auto-generated types in `raycast-env.d.ts` (do not modify)

### Code Organization
- Separate concerns into distinct modules
- Use TypeScript for type safety
- Follow React best practices
- Implement proper error handling

### Security
- Never expose API keys or sensitive data
- Use secure storage for user credentials
- Validate all user inputs
- Follow security best practices for external API calls