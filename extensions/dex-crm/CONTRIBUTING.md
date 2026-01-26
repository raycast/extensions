# Contributing to Dex CRM Raycast Extension

First off, thank you for considering contributing to this project! 🎉

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what you expected
- **Include screenshots** if relevant
- **Note your environment**: Raycast version, macOS version, extension version

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any alternatives** you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** with clear, descriptive commits
3. **Add tests** if you've added code that should be tested
4. **Ensure the test suite passes**: `npm test`
5. **Run the linter**: `npm run lint`
6. **Update documentation** if you changed APIs or added features
7. **Submit your pull request**!

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/dex-raycast-extension.git
cd dex-raycast-extension

# Install dependencies
npm install

# Start development mode
npm run dev

# Run tests
npm test

# Watch tests (helpful during development)
npm run test:watch

# Check code style
npm run lint

# Auto-fix style issues
npm run fix-lint
```

## Project Structure

```
dex-raycast-extension/
├── src/
│   ├── __tests__/              # Test files
│   ├── search-contacts.tsx     # Main search command
│   ├── manage-reminders.tsx    # Reminders management
│   ├── contact-detail-list.tsx # Contact detail view
│   ├── dex-api.ts              # API client
│   ├── types.ts                # TypeScript definitions
│   └── utils.ts                # Utility functions
├── .github/workflows/          # CI/CD configuration
├── assets/                     # Extension icons
└── package.json               # Dependencies and scripts
```

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper types (avoid `any` when possible)
- Use interfaces for object shapes
- Export types that might be reused

### Code Style

- We use ESLint and Prettier for code formatting
- 2 spaces for indentation
- Use `const` by default, `let` when reassignment is needed
- Prefer arrow functions for callbacks
- Use async/await over promises

### Testing

- Write tests for new features
- Update tests when changing existing code
- Aim for meaningful test coverage
- Use descriptive test names

Example:

```typescript
describe("ContactDetailList", () => {
  it("renders contact information correctly", () => {
    // Test implementation
  });

  it("displays email addresses", () => {
    // Test implementation
  });
});
```

### Commits

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Keep the first line under 72 characters
- Reference issues and pull requests liberally

Examples:

```
Good: Add snooze functionality to reminders
Good: Fix phone number display bug
Bad: added new feature
Bad: Fixed stuff
```

### Component Guidelines

**Search Performance**

- Use caching for large data sets
- Debounce search inputs when appropriate
- Show loading states for async operations

**Keyboard Shortcuts**

- Use standard Raycast conventions
- Document all shortcuts in README
- Avoid conflicts with system shortcuts

**Error Handling**

- Always handle API errors gracefully
- Show user-friendly error messages
- Log errors for debugging

## Testing Your Changes

### Manual Testing Checklist

Before submitting a PR, test these scenarios:

- [ ] Search works with various queries
- [ ] Contact details display correctly
- [ ] Email/phone actions work
- [ ] Reminders can be created/edited/deleted
- [ ] Snooze functionality works
- [ ] Notes can be added
- [ ] Name editing with email suggestions works
- [ ] Error handling works (try with invalid API key)
- [ ] All keyboard shortcuts work

### Automated Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Documentation

- Update README.md for new features
- Add JSDoc comments for complex functions
- Update CHANGELOG.md following Keep a Changelog format
- Include screenshots for UI changes

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a new release on GitHub
4. Tag the release with version number (e.g., `v1.2.0`)

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
