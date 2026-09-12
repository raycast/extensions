# Contributing to LanguageTool for Raycast

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## 🤝 How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- **Clear title** - Describe the bug briefly
- **Steps to reproduce** - How can we reproduce the issue?
- **Expected behavior** - What should happen?
- **Actual behavior** - What actually happens?
- **Environment** - Raycast version, macOS version
- **Screenshots** - If applicable

**Example:**
```markdown
**Bug**: Language selection not persisting

**Steps to reproduce:**
1. Open "Check Text" command
2. Select "Portuguese (Brazil)"
3. Check some text
4. Open command again

**Expected:** Portuguese (Brazil) should be selected
**Actual:** Defaults back to English (US)

**Environment:**
- Raycast: 1.60.0
- macOS: 14.1
```

### Suggesting Features

Create an issue with:

- **Clear description** - What feature do you want?
- **Use case** - Why is this useful?
- **Examples** - How would it work?
- **Alternatives** - Have you considered other approaches?

### Submitting Changes

1. **Fork** the repository
2. **Create a branch** for your feature/fix
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b fix/bug-description
   ```
3. **Make your changes** following the code style
4. **Test your changes** thoroughly
5. **Commit** with clear messages
6. **Push** to your fork
7. **Open a Pull Request**

## 💻 Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Raycast app installed

### Setup

```bash
# Clone the repository
git clone https://github.com/raycast/extensions.git
cd extensions/extensions/language-tool

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Project Structure

```
src/
├── check-text.tsx              # Main command (form)
├── check-text-instant.tsx      # Background command
├── components/                 # React components
│   ├── check-text-result.tsx  # Results orchestrator
│   ├── result-metadata.tsx    # Metadata display
│   └── result-actions.tsx     # Action panel
├── hooks/                      # React hooks
│   └── use-text-corrections.ts
├── services/                   # Business logic
│   └── languagetool-api.ts    # API client
├── utils/                      # Pure functions
│   └── text-correction.ts
├── config/                     # Configuration
│   └── api.ts
└── types.ts                   # TypeScript types
```

## 📝 Code Style

### TypeScript

- Use **TypeScript** for all new code
- Provide **type annotations** for parameters and return values
- Use **type** over interfaces (following Raycast conventions)
- Avoid `any` - use proper types or `unknown`

**Good:**
```typescript
type CheckTextOptions = {
  text: string;
  language: string;
};

async function checkText(options: CheckTextOptions): Promise<CheckTextResponse> {
  // ...
}
```

**Bad:**
```typescript
async function checkText(options: any) {
  // ...
}
```

### React Components

- Use **functional components**
- Use **hooks** for state and effects
- Keep components **small and focused**
- Extract reusable logic into **custom hooks**

**Good:**
```typescript
export default function MyComponent({ title }: { title: string }) {
  const [value, setValue] = useState("");
  
  return <Form.TextField title={title} value={value} onChange={setValue} />;
}
```

### Naming Conventions

- **Components**: PascalCase (`CheckTextResult`)
- **Files**: kebab-case (`check-text-result.tsx`)
- **Functions**: camelCase (`checkTextWithAPI`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **Types**: PascalCase (`CheckTextOptions`)
- **Hooks**: use + PascalCase (`useTextCorrections`)

### File Organization

- **Components** → `src/components/`
- **Hooks** → `src/hooks/`
- **Services** → `src/services/`
- **Utils** → `src/utils/`
- **Types** → `src/types.ts`
- **Config** → `src/config/`

### Comments

- Use **JSDoc** for public functions
- Add **inline comments** for complex logic
- Keep comments **up-to-date** with code changes

```typescript
/**
 * Checks text with LanguageTool API
 * Automatically includes Premium credentials if configured
 * 
 * @param options - Check options including text and language
 * @returns API response with matches and suggestions
 * @throws Error if API request fails
 */
export async function checkTextWithAPI(
  options: CheckTextOptions
): Promise<CheckTextResponse> {
  // ...
}
```

## 🧪 Testing

### Manual Testing

Before submitting:

1. Test in **development mode** (`npm run dev`)
2. Test both commands:
   - Check Text (interactive)
   - Check Text Instant (background)
3. Test with **multiple languages**
4. Test **advanced options** if changed
5. Check for **TypeScript errors**: `npm run lint`

### Test Checklist

- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] Commands work as expected
- [ ] UI renders correctly
- [ ] Keyboard shortcuts work
- [ ] Preferences are respected
- [ ] Error handling works

## 📦 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Test changes
- `chore` - Build/tooling changes

**Examples:**
```
feat(api): add support for disabled categories

fix(form): language selection not persisting

docs(readme): add advanced options guide

refactor(components): extract metadata to separate component
```

## 🔍 Pull Request Guidelines

### Before Submitting

- [ ] Code follows the style guide
- [ ] TypeScript compiles without errors
- [ ] Linter passes without warnings
- [ ] Tested manually in development
- [ ] Updated documentation if needed
- [ ] Added/updated types if needed

### PR Description

Include:

1. **What** - What does this PR do?
2. **Why** - Why is this change needed?
3. **How** - How does it work?
4. **Testing** - How did you test it?
5. **Screenshots** - If UI changes

**Example:**
```markdown
## What
Adds support for disabled categories in advanced options

## Why
Users requested ability to disable entire categories (like STYLE) instead of individual rules

## How
- Added `disabledCategories` field to form
- Updated API service to include parameter
- Added documentation

## Testing
- Tested with "STYLE" disabled
- Verified API receives correct parameter
- Checked with multiple categories

## Screenshots
[Screenshot of new field]
```

## 🏗️ Architecture Principles

Follow these principles when contributing:

### 1. Separation of Concerns
- **UI** (components) shouldn't contain business logic
- **Hooks** manage state and side effects
- **Services** handle API calls and external integrations
- **Utils** contain pure functions

### 2. Single Responsibility
- Each file/function has **one purpose**
- Keep components **small and focused**
- Extract reusable logic

### 3. Pure Functions
- Prefer **pure functions** in utils
- Easier to test and reason about
- No side effects

### 4. Type Safety
- Use **TypeScript** everywhere
- Provide proper **type definitions**
- Avoid `any` type

## 🎨 UI Guidelines

### Raycast Components

Use Raycast's native components:
- `Form` - For input forms
- `List` - For lists
- `Detail` - For detailed views
- `ActionPanel` - For actions

### Keyboard Shortcuts

- Use **⌘** for primary actions
- Use **⌘⇧** for secondary actions
- Use **⌥** for alternative actions
- Avoid conflicts with Raycast defaults

### Loading States

- Show `isLoading` when fetching data
- Use `Toast` for feedback
- Show progress when applicable

## 📚 Documentation

Update documentation when:
- Adding new features
- Changing behavior
- Adding new options
- Fixing significant bugs

Files to update:
- `README.md` - User-facing changes
- `ADVANCED_OPTIONS.md` - New options
- `CHANGELOG.md` - All changes
- Code comments - Implementation details

## 🐛 Debugging

### Raycast Logs

View logs in development:
```bash
npm run dev
# Logs appear in terminal
```

### Console Logs

```typescript
console.log("Debug info:", value);
console.error("Error:", error);
```

### TypeScript Errors

```bash
npm run lint
```

## 📞 Getting Help

- 💬 [Join the Raycast Community](https://raycast.com/community)
- 🐛 [GitHub Issues](https://github.com/raycast/extensions/issues)
- 📖 [Raycast Documentation](https://developers.raycast.com/)
- 📖 [LanguageTool API Docs](https://languagetool.org/http-api/)

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉

