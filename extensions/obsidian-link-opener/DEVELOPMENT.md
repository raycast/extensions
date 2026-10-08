# Development Guide

This guide contains information for developers who want to contribute to or modify the Obsidian URL Opener extension.

## Prerequisites

- **Node.js**: Required for development (the extension runs in Raycast's runtime)
- **Bun**: Package manager used for this project
- **Raycast**: Required for testing the extension locally

## Development Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/osteele/raycast-open-obsidian-links.git
   cd raycast-open-obsidian-links
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start development:
   ```bash
   bun run dev
   ```

4. The extension will open in Raycast for testing

## Tech Stack

- **TypeScript**: Type-safe development
- **React**: For Raycast UI components
- **SQLite**: Local database for note metadata
- **better-sqlite3**: Database driver
- **gray-matter**: Frontmatter parsing
- **fs-extra**: Enhanced file system operations

## Project Structure

```
src/
├── index.tsx           # Main command entry point
├── commands/           # Additional Raycast commands
├── services/           # Core business logic
│   ├── database.ts     # SQLite database operations
│   ├── parser.ts       # Frontmatter parsing
│   ├── scanner.ts      # Vault scanning
│   └── refreshIndex.ts # Index refresh logic
├── hooks/              # React hooks
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Available Scripts

- `bun run build` - Build the extension
- `bun run dev` - Start development mode
- `bun run lint` - Run linting
- `bun run fix` - Fix linting issues
- `bun run test` - Run tests
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Generate test coverage report

## Testing

The project uses Vitest for testing with comprehensive mocks for the Raycast API. 

### Running Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run a specific test file
bun run test -- tests/preferences.test.ts
```

### Test Structure

- Tests are located in the `test/` directory
- Mocks for the Raycast API are in `test/mocks/`
- Use descriptive test names and explicit assertions

## Code Style Guidelines

- **Files**: camelCase for utils/hooks, PascalCase for components
- **Types**: Define interfaces in `src/types/index.ts`
- **Hooks**: Custom React hooks in `src/hooks/` with `use` prefix
- **Services**: Core logic in `src/services/` (database, parser, scanner)
- **Error handling**: Use try/catch, handle errors explicitly
- **Functions**: Descriptive names, explicit return types
- **Components**: Raycast commands go in `src/commands/`

## Architecture Overview

### How It Works

1. **Scanning**: The extension scans your Obsidian vault for markdown files
2. **Parsing**: Extracts URLs from frontmatter properties using gray-matter
3. **Storage**: Stores note metadata and URLs in a local SQLite database
4. **Display**: Shows notes with URLs in a searchable Raycast list
5. **Actions**: Provides actions to open URLs or copy them to clipboard

### Database Schema

The SQLite database stores:
- Note metadata (title, path, modified date)
- URL mappings (property name, URL value)
- Index refresh timestamps

### Performance Considerations

- Large vaults may take time to index initially
- The extension uses incremental scanning to minimize resource usage
- Database queries are optimized for fast search and retrieval

## Supported URL Properties

See [Supported URL Properties](docs/supported-properties.md) for the complete list of frontmatter properties that the extension recognizes.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. Make sure all tests pass before submitting PR
2. Update tests for new functionality
3. Follow the existing code style
4. Update documentation as needed

## Debugging Tips

- Use Raycast's developer tools for debugging
- Check the Raycast logs for error messages
- SQLite database is stored in Raycast's support directory
- Use `console.log` for debugging (appears in Raycast logs)

## Publishing

The extension can be published to the Raycast Store. See [Raycast's publishing guide](https://developers.raycast.com/basics/publish-an-extension) for details.

## Related Documentation

- [Raycast API Documentation](https://developers.raycast.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)