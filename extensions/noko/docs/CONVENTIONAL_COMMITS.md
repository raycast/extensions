# Conventional Commits Guide

This guide helps you write proper conventional commit messages that work with Release Please for automatic changelog generation.

## 🚀 Quick Start

### Using Commitizen (Recommended)

```bash
# Install dependencies first
npm install

# Use interactive commit tool
npm run commit
```

This will guide you through creating a proper conventional commit message step by step.

## 📝 Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Examples

```bash
# Simple feature
feat: add timer pause functionality

# Feature with scope
feat(timer): add pause and resume functionality

# Bug fix
fix: resolve timer state synchronization issue

# Breaking change
feat!: redesign timer interface

BREAKING CHANGE: Timer component props have changed

# With body and footer
feat(api): add new timer endpoints

Add POST /timer/start and PUT /timer/pause endpoints
to improve timer management capabilities.

Closes #123
```

## 🏷️ Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add timer pause functionality` |
| `fix` | Bug fix | `fix: resolve timer state sync issue` |
| `docs` | Documentation changes | `docs: update API documentation` |
| `style` | Code style changes (formatting, etc.) | `style: format code with prettier` |
| `refactor` | Code refactoring | `refactor: simplify timer state management` |
| `perf` | Performance improvements | `perf: optimize timer rendering` |
| `test` | Test additions or changes | `test: add timer pause tests` |
| `build` | Build system changes | `build: update webpack configuration` |
| `ci` | CI configuration changes | `ci: add GitHub Actions workflow` |
| `chore` | Maintenance tasks | `chore: update dependencies` |

## 🎯 Scopes (Optional)

Scopes help categorize changes within your codebase:

```bash
# Timer-related changes
feat(timer): add pause functionality
fix(timer): resolve state sync issue

# API-related changes
feat(api): add new endpoints
fix(api): handle error responses

# UI-related changes
feat(ui): improve timer display
fix(ui): fix button alignment

# Component-specific
feat(TimerItem): add pause button
fix(EntryItem): resolve display issue
```

## 💥 Breaking Changes

Use `!` after the type or add `BREAKING CHANGE:` in the footer:

```bash
# Method 1: Use ! after type
feat!: redesign timer interface

# Method 2: Use BREAKING CHANGE footer
feat: redesign timer interface

BREAKING CHANGE: Timer component props have changed.
The `onStart` prop is now `onTimerStart`.
```

## 🛠️ Tools and Helpers

### 1. **Commitizen** (Interactive)
```bash
npm run commit
```

This will ask you:
- What type of change?
- What scope (optional)?
- Short description
- Long description (optional)
- Breaking changes (optional)
- Issues closed (optional)

### 2. **VS Code Extensions**
- **Conventional Commits**: Provides autocomplete for commit types
- **GitLens**: Enhanced git integration with commit templates

### 3. **Git Hooks** (Optional)
You can add a pre-commit hook to enforce conventional commits:

```bash
# Install commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Create .commitlintrc.js
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > .commitlintrc.js
```

### 4. **AI Assistants**
- **GitHub Copilot**: Can suggest conventional commit messages
- **ChatGPT/Claude**: Can help format your commits

## 📋 Common Patterns

### Feature Development
```bash
# Start with a feature
feat: add timer pause functionality

# Add tests
test: add timer pause tests

# Update docs
docs: document timer pause API

# Fix issues
fix: resolve timer pause edge case
```

### Bug Fixes
```bash
# Fix the bug
fix: resolve timer state synchronization issue

# Add test to prevent regression
test: add test for timer state sync

# Update docs if needed
docs: update timer state documentation
```

### Refactoring
```bash
# Refactor code
refactor: simplify timer state management

# Update tests
test: update timer state tests

# Update docs
docs: update timer architecture docs
```

## 🎨 Best Practices

### 1. **Be Descriptive**
```bash
# Good
feat(timer): add pause and resume functionality

# Bad
feat: add stuff
```

### 2. **Use Present Tense**
```bash
# Good
feat: add timer pause functionality

# Bad
feat: added timer pause functionality
```

### 3. **Keep First Line Under 50 Characters**
```bash
# Good
feat: add timer pause

# Bad
feat: add timer pause functionality with state management and error handling
```

### 4. **Use Body for Complex Changes**
```bash
feat: add timer pause functionality

Add pause and resume functionality to the timer component.
This includes state management, UI updates, and API integration.

- Add pause button to timer UI
- Implement pause state in timer hook
- Update API client with pause endpoint
- Add tests for pause functionality
```

### 5. **Reference Issues**
```bash
feat: add timer pause functionality

Closes #123
Fixes #456
```

## 🚨 Common Mistakes

### ❌ Don't Do This
```bash
# Too vague
fix: fix bug

# Wrong tense
feat: added new feature

# Too long
feat: add timer pause functionality with state management and error handling and UI updates

# Missing type
add timer pause functionality
```

### ✅ Do This Instead
```bash
# Specific and clear
fix: resolve timer state synchronization issue

# Present tense
feat: add timer pause functionality

# Concise
feat: add timer pause

# Proper format
feat: add timer pause functionality
```

## 🔄 Workflow Integration

### 1. **Development Workflow**
```bash
# Make changes
git add .

# Use commitizen for proper format
npm run commit

# Push changes
git push origin main
```

### 2. **Release Process**
1. Make commits with conventional format
2. Push to main branch
3. Release Please creates a PR automatically
4. Review and merge the PR
5. GitHub release is created automatically

## 📚 Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Commitizen Documentation](https://github.com/commitizen/cz-cli)
- [Release Please Documentation](https://github.com/googleapis/release-please-action)

## 🎯 Quick Reference

```bash
# Feature
feat: add new functionality

# Bug fix
fix: resolve issue

# Documentation
docs: update documentation

# Style
style: format code

# Refactor
refactor: improve code structure

# Performance
perf: optimize performance

# Test
test: add tests

# Build
build: update build system

# CI
ci: update CI configuration

# Chore
chore: maintenance tasks
```
