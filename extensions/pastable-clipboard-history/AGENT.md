# Pastable Clipboard History - Development Guide

## 🚀 Project Overview

A Raycast extension for managing clipboard history with dedicated keyboard shortcuts for pasting items from positions 0-9.

## 📁 Project Structure

```
pastable-clipboard-history/
├── src/
│   ├── paste-utils.ts          # Core clipboard management logic
│   ├── paste-current.tsx       # Paste current item (position 0)
│   ├── paste-first.tsx         # Paste 1st previous item (offset 1)
│   ├── paste-second.tsx        # Paste 2nd previous item (offset 2)
│   ├── paste-third.tsx         # Paste 3rd previous item (offset 3)
│   ├── paste-fourth.tsx        # Paste 4th previous item (offset 4)
│   ├── paste-fifth.tsx         # Paste 5th previous item (offset 5)

├── tests/
│   ├── paste-commands.test.ts  # Tests for paste operations
│
│   ├── integration.test.ts     # Integration tests
│   ├── edge-cases.test.ts      # Edge case tests
│   └── __mocks__/              # Test mocks
├── package.json                # Extension metadata & commands
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Test configuration
└── README.md                  # User documentation
```

## 🛠️ Development Setup

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Raycast app installed
- TypeScript knowledge

### Initial Setup

```bash
# Navigate to the project directory
cd /path/to/pastable-clipboard-history

# Install dependencies
npm install

# Start development mode with hot reload
npm run dev
```

**⚠️ Important**: Always run commands from the `pastable-clipboard-history` directory, not the parent directory.

## 📋 Available Scripts

| Command                 | Purpose                           | Usage                       |
| ----------------------- | --------------------------------- | --------------------------- |
| `npm run dev`           | Start development with hot reload | Primary development command |
| `npm run build`         | Build extension for production    | Before publishing           |
| `npm test`              | Run test suite                    | CI/CD and validation        |
| `npm run test:watch`    | Run tests in watch mode           | Active development          |
| `npm run test:coverage` | Run tests with coverage report    | Quality assurance           |
| `npm run lint`          | Check code style                  | Code quality                |
| `npm run fix-lint`      | Auto-fix linting issues           | Code cleanup                |

## 🏗️ Development Workflow

### 1. Standard Development Process

```bash
# 1. Start development mode
npm run dev

# 2. Make changes to source files
# 3. Test in Raycast (automatic reload)
# 4. Run tests to ensure quality
npm test

# 5. Check coverage
npm run test:coverage
```

### 2. Adding New Commands

1. **Create command file**: `src/new-command.tsx`
2. **Add to package.json**: Update `commands` array
3. **Export function**: Follow existing patterns
4. **Add tests**: Create corresponding test file
5. **Update documentation**: README and this guide

### 3. Code Style & Quality

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Raycast config
- **Testing**: Jest with 100% coverage target
- **Formatting**: Prettier integration

## 🧪 Testing Strategy

### Test Structure

```
tests/
├── paste-commands.test.ts    # Core paste functionality

├── integration.test.ts       # Cross-command integration
├── edge-cases.test.ts        # Error handling & edge cases
└── __mocks__/                # Raycast API mocks
```

### Test Categories

1. **Unit Tests**: Individual function testing
2. **Integration Tests**: Command interaction testing
3. **Edge Cases**: Error handling & boundary conditions
4. **Coverage Tests**: Ensure 100% code coverage

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for active development
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- paste-commands.test.ts

# Specific test pattern
npm test -- --testNamePattern="edge cases"
```

## 🔧 Architecture & Patterns

### Core Components

#### 1. `paste-utils.ts` - Main Logic

```typescript
// Paste operation (non-destructive)
export async function pasteClipboardAtPosition(offset: number, positionName: string): Promise<void>;
```

#### 2. Command Files Pattern

```typescript
import { pasteClipboardAtPosition } from "./paste-utils";

export default async function Command() {
  await pasteClipboardAtPosition(0, "current");
}
```

### Error Handling Strategy

- **Graceful degradation**: Operations continue on non-critical errors
- **User feedback**: Toast notifications for errors, HUD for success
- **Comprehensive logging**: Console logs for debugging
- **Fallback behavior**: Paste succeeds even if promotion fails

## 🐛 Debugging & Troubleshooting

### Common Issues

#### 1. "Package.json not found"

```bash
# Problem: Running commands from wrong directory
# Solution: Navigate to project directory
cd pastable-clipboard-history
npm run dev
```

#### 2. Extension not updating in Raycast

```bash
# Stop and restart development mode
pkill -f "ray develop"
npm run dev

# Or restart Raycast completely
```

#### 3. Tests failing after changes

```bash
# Check test output for specific failures
npm test

# Update snapshots if needed
npm test -- --updateSnapshot

# Check coverage to identify missing tests
npm run test:coverage
```

#### 4. TypeScript errors

```bash
# Check TypeScript compilation
npm run build

# Fix linting issues
npm run fix-lint
```

### Debugging Techniques

1. **Console Logging**: Use `console.log()` - appears in Raycast debug panels
2. **Hot Reload**: Development mode auto-updates on file changes
3. **Test-Driven Development**: Write tests first, then implement
4. **Raycast Inspector**: Use Raycast's built-in debugging tools

## 📦 Publishing & Deployment

### Pre-Publication Checklist

- [ ] All tests passing: `npm test`
- [ ] 100% test coverage: `npm run test:coverage`
- [ ] No linting errors: `npm run lint`
- [ ] Successful build: `npm run build`
- [ ] Updated README with new features
- [ ] Version bump in `package.json`

### Publishing Process

```bash
# 1. Build the extension
npm run build

# 2. Test the build locally
npm run dev

# 3. Submit via Raycast Developer Portal
# (Manual process through Raycast interface)
```

## 🔒 Security & Best Practices

### Security Guidelines

- **No hardcoded secrets**: Use Raycast's secure storage
- **Input validation**: Sanitize clipboard content
- **Error boundaries**: Prevent crashes from propagating
- **Minimal permissions**: Only request necessary access

### Code Quality Standards

- **100% test coverage** maintained
- **TypeScript strict mode** enabled
- **ESLint compliance** required
- **Consistent code style** via Prettier
- **Comprehensive documentation** for all functions

## 📚 API Reference

### Raycast API Usage

```typescript
import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";

// Read clipboard at specific offset
const content = await Clipboard.readText({ offset: 0 });

// Paste content
await Clipboard.paste(content);

// Copy to clipboard
await Clipboard.copy(content);

// Show success message
await showHUD("Success message");

// Show error toast
await showToast({
  style: Toast.Style.Failure,
  title: "Error Title",
  message: "Error details",
});
```

### Project-Specific APIs

```typescript
// Paste from specific position (non-destructive)
await pasteClipboardAtPosition(1, "first");
```

## 🤝 Contributing Guidelines

### Code Contribution Process

1. **Fork & Clone**: Create development environment
2. **Create Branch**: Feature/bugfix branch from main
3. **Implement Changes**: Follow established patterns
4. **Add Tests**: Maintain 100% coverage
5. **Test Thoroughly**: All scenarios and edge cases
6. **Submit PR**: With clear description and test evidence

### Code Review Criteria

- ✅ Functionality works as intended
- ✅ Tests added and passing
- ✅ Coverage maintained at 100%
- ✅ Code follows established patterns
- ✅ Documentation updated
- ✅ No breaking changes (unless intentional)

## 📖 Additional Resources

- [Raycast Developer Documentation](https://developers.raycast.com/)
- [Raycast Extension Examples](https://github.com/raycast/extensions)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/)

---

**Happy Coding! 🚀**

For questions or issues, refer to this guide first, then check existing tests for examples.
