# Prompt Pocket

A Raycast Extension for managing and reusing text prompts efficiently.

[日本語版 README はこちら](README.ja.md)

## Features

- 💾 Save and organize text prompts
- 🔍 Search through your prompts
- 📋 Quick copy to clipboard
- 🏷️ Tag-based organization
- ✏️ Easy editing and management
- 🎯 Placeholder support: `{clipboard}` and `{cursor}`

## Usage

1. Use `Manage Prompts` command to view and manage your prompts
2. Press `Enter` to copy a prompt to clipboard
3. Use `⌘ + N` to create a new prompt
4. Use `⌘ + E` to edit an existing prompt
5. Use `⌘ + ⌫` to delete a prompt

### Placeholders

Prompts support dynamic placeholders:

- **`{clipboard}`**: Inserts current clipboard content
- **`{cursor}`**: Sets cursor position after paste

Example:
```
Bug Report: {clipboard}

Steps to reproduce:
1. {cursor}
2. 
3. 
```

## Installation

Install via [Raycast Store](https://www.raycast.com/marty-martini/prompt-pocket)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build extension
npm run build
```

### Testing

This project includes comprehensive unit and integration tests:

- **109 tests** across 4 test files
- Unit tests for utility functions
- Type validation tests
- Placeholder processing tests
- Integration tests for storage layer

```bash
# Run all tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# View coverage report
npm run test:coverage
```

## License

MIT License - see [LICENSE](LICENSE) file for details

