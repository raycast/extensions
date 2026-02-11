# Contributing to Logos Launcher

Thank you for your interest in contributing to Logos Launcher! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/logos-search.git
   cd logos-search
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/michael_marvive/logos-search.git
   ```

## Development Setup

### Prerequisites

- **Node.js** 18 or later
- **npm** 8 or later
- **Raycast** installed with developer mode enabled
- **Logos Bible Software** installed (for testing)
- **macOS** (Raycast extensions only run on macOS)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. In Raycast, the extension will appear with a development badge.

### Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode with hot reload |
| `npm run build` | Build for production |
| `npm run lint` | Check for linting issues |
| `npm run fix-lint` | Auto-fix linting and formatting issues |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Code Style

This project uses:

- **TypeScript** for type safety
- **ESLint** for linting (via Raycast's configuration)
- **Prettier** for code formatting

### Guidelines

1. **Use TypeScript** - All new code should be written in TypeScript
2. **Export types** - Define types for function parameters and return values
3. **Prefer functional components** - For React components in command views
4. **Use shared utilities** - Check `src/utils/` and `src/logos/` for existing helpers
5. **Handle errors gracefully** - Use `extractErrorMessage()` for consistent error handling
6. **Add JSDoc comments** - For public functions and complex logic

### File Organization

```
src/
├── data/           # Static data (Bible books, Logos tools catalog)
├── logos/          # Logos-specific utilities (installation detection)
├── utils/          # General utility functions
├── *.tsx           # React command views
└── *.ts            # No-view commands
```

## Testing

We use [Vitest](https://vitest.dev/) for unit testing.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Writing Tests

- Place test files next to the code they test: `*.test.ts`
- Test pure functions directly
- Mock external dependencies (like `@raycast/api` or file system)
- See `src/utils/*.test.ts` for examples

## Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit with clear messages:
   ```bash
   git commit -m "feat: add new search filter option"
   ```
   
   Use conventional commit prefixes:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

3. **Ensure your code passes all checks**:
   ```bash
   npm run lint
   npm test
   npm run build
   ```

4. **Push your branch** and open a pull request

5. **Fill out the PR template** with:
   - Description of changes
   - Related issue (if applicable)
   - Testing performed
   - Screenshots (for UI changes)

### PR Review Guidelines

- PRs should be focused on a single feature or fix
- Keep PRs reasonably sized for easier review
- Respond to feedback promptly
- Squash commits before merging if requested

## Reporting Bugs

Please use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml) when reporting bugs.

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Raycast version, macOS version, Logos version)
- Any relevant screenshots or logs

## Suggesting Features

Please use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml) for new ideas.

Include:
- Problem you're trying to solve
- Proposed solution
- Alternative approaches considered
- How important this is to your workflow

## Questions?

If you have questions that aren't covered here, feel free to [open a discussion](https://github.com/michael_marvive/logos-search/discussions) or reach out via the issue tracker.

Thank you for contributing! 🙏
