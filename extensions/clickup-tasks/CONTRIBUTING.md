# Contributing to ClickUp Tasks

Thank you for your interest in contributing to the ClickUp Tasks Raycast extension! This document will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Feature Requests & Bug Reports](#feature-requests--bug-reports)

## Code of Conduct

This project follows the [Raycast Community Guidelines](https://developers.raycast.com/basics/contribute-to-an-extension#contributing). Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or pnpm
- A Raycast account and the Raycast app installed
- A ClickUp account with API access

### What to Work On

Check out the [Roadmap](ROADMAP.md) for planned features. Look for items marked:

- 🎯 **HIGH PRIORITY** - Important features with high impact
- **QUICK WIN** - Low complexity, good for first contributions

You can also:

- Browse [open issues](../../issues) for bugs and feature requests
- Propose new features by opening an issue first

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/clickup-tasks.git
cd clickup-tasks
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Extension

Create a `.env` file or configure through Raycast preferences:

- **ClickUp API Token**: Generate from ClickUp Settings > Apps > API Token
- **List ID**: Find in your ClickUp list URL (optional for some commands)

### 4. Start Development

```bash
npm run dev
```

This starts the extension in development mode with hot reload. Your changes will appear immediately in Raycast.

## Project Structure

```
src/
├── api/              # ClickUp API client
│   └── clickup.ts    # API methods and request handling
├── components/       # Reusable React components
│   ├── actions/      # Action components (status, copy, navigation)
│   ├── lists/        # List-related components
│   └── tasks/        # Task-related components
├── constants/        # Constants and keyboard shortcuts
│   └── shortcuts.ts  # Centralized shortcut definitions
├── contexts/         # React context providers
│   └── TasksContext.tsx  # Task state management
├── hooks/            # Custom React hooks
│   ├── useLists.ts   # Fetch and manage lists
│   ├── useMyTasks.ts # Fetch tasks for current user
│   └── useTasks.ts   # Fetch and manage tasks
├── types/            # TypeScript type definitions
│   ├── clickup.ts    # ClickUp API types
│   └── raycast.ts    # Raycast API type aliases
├── utils/            # Helper functions
│   ├── format-helpers.ts  # Formatting utilities
│   └── task-helpers.ts    # Task manipulation utilities
├── lists.tsx         # Browse Lists command
├── tasks.tsx         # List Tasks command
└── my-tasks.tsx      # My Tasks command
```

## Development Workflow

### Creating a Feature

1. **Create a branch** from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Develop** with hot reload active (`npm run dev`)

3. **Test thoroughly** - try different scenarios, edge cases, error states

4. **Follow code standards** (see below)

5. **Update documentation** if needed

### Making Changes

- **Small, focused commits** - one logical change per commit
- **Descriptive commit messages** - use conventional commits format:
  ```
  feat: add task creation form
  fix: resolve duplicate task rendering
  refactor: extract task metadata hook
  docs: update README with new shortcuts
  ```

## Code Standards

### TypeScript

- **No `any` types** - use specific types or `unknown` if truly dynamic
- **Prefer interfaces** for component props, types for unions/intersections
- **Use `Pick` and `Omit`** from `UseCachedPromiseReturnType` for hook returns
- **Export types** that might be reused

### React

- **Extract business logic** from components into hooks or utilities
- **Use `useMemo`** for expensive computations
- **Use `useCallback`** for functions passed as props
- **Memoize context values** to prevent unnecessary re-renders
- **Component props** should be named `Props` if not exported

### Code Style

- **ESLint + Prettier** - run `npm run lint` and `npm run fix-lint`
- **Import sorting** - handled by eslint-plugin-perfectionist
- **Object/interface sorting** - alphabetical order (auto-sorted by linter)
- **Inline comments** - only for very complex logic
- **Block comments** - use for documenting functionality

### Performance

- **Parallel API calls** - use `Promise.all` for independent requests
- **Memoize expensive operations** - especially `groupTasksWithSubtasks`
- **Avoid O(N²)** - consider lookup maps for repeated searches
- **Cache API responses** - leverage `useCachedPromise`

### File Organization

- **New hooks** go in `src/hooks/`
- **Reusable components** go in appropriate `src/components/` subdirectory
- **Utilities** go in `src/utils/` (categorize by purpose)
- **Types** go in `src/types/` (organized by domain)
- **One component per file** unless tightly coupled

## Testing

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] **Basic functionality** works as expected
- [ ] **Error states** are handled gracefully (network errors, API errors, rate limits)
- [ ] **Empty states** display correctly
- [ ] **Loading states** show appropriate feedback
- [ ] **Keyboard shortcuts** work correctly
- [ ] **Search/filtering** performs well with large datasets
- [ ] **Different ClickUp configurations** (various list types, custom fields, etc.)

### Automated Testing

We don't have automated tests yet (see [Roadmap](ROADMAP.md) technical debt section), but contributions to add testing infrastructure are welcome!

## Submitting Changes

### Before Submitting

1. **Run linting**:

   ```bash
   npm run lint
   ```

2. **Build successfully**:

   ```bash
   npm run build
   ```

3. **Test in Raycast** - use the extension extensively

4. **Update CHANGELOG.md** if it exists (or create it):

   ```markdown
   ## [Unreleased]

   ### Added

   - New feature description

   ### Fixed

   - Bug fix description

   ### Changed

   - Change description
   ```

5. **Update README.md** if adding user-facing features

6. **Check ROADMAP.md** - mark items as complete `- [x]` if applicable

### Pull Request Process

1. **Push your branch** to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a PR** on GitHub:
   - Use a descriptive title
   - Reference related issues: "Fixes #123" or "Relates to #456"
   - Describe what changed and why
   - Include screenshots/GIFs for UI changes
   - List any breaking changes

3. **PR Template** (use this structure):

   ```markdown
   ## Description

   Brief description of the change

   ## Motivation

   Why is this change needed?

   ## Changes

   - Bullet list of changes

   ## Screenshots (if applicable)

   [Add screenshots or GIFs]

   ## Testing

   How did you test this? What scenarios did you cover?

   ## Checklist

   - [ ] Linting passes (`npm run lint`)
   - [ ] Build succeeds (`npm run build`)
   - [ ] Tested in Raycast
   - [ ] Updated documentation
   - [ ] Updated CHANGELOG.md
   ```

4. **Respond to feedback** - address review comments promptly

### What Happens Next

- Maintainer will review your PR
- You may be asked to make changes
- Once approved, your PR will be merged
- You'll be credited as a contributor!

## Feature Requests & Bug Reports

### Reporting Bugs

When reporting bugs, include:

- **Description** - what happened vs what should happen
- **Steps to reproduce** - detailed steps
- **Expected behavior** - what you expected
- **Actual behavior** - what actually happened
- **Environment** - Raycast version, macOS version, extension version
- **Screenshots/logs** - if applicable

### Requesting Features

When requesting features:

- **Search existing issues** first
- **Describe the use case** - what problem does it solve?
- **Propose a solution** - how might it work?
- **Check the roadmap** - it might already be planned

## Questions?

- Check the [README](README.md) for usage documentation
- Check the [Roadmap](ROADMAP.md) for planned features
- Browse [existing issues](../../issues)
- Open a new issue for questions

## Recognition

All contributors will be:

- Listed in the extension's contributors section
- Credited in release notes
- Part of building a better ClickUp experience for Raycast users!

Thank you for contributing! 🚀
