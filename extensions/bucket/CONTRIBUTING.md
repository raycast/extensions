# Contributing to Bucket Raycast Extension

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Raycast installed on macOS
- Git for version control
- A Bucket account for testing

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/bucket.git
   cd bucket/raycast-extension
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development mode**

   ```bash
   npm run dev
   ```

4. **Open Raycast**
   - Your extension will appear at the top of search
   - Changes will hot-reload automatically

## Project Structure

```
raycast-extension/
├── src/
│   ├── lib/
│   │   ├── api.ts              # API client
│   │   └── auth-utils.ts       # Auth helpers
│   ├── components/
│   │   └── EditBookmarkForm.tsx
│   ├── connect-device.tsx      # Device pairing
│   ├── manage-auth.tsx         # Auth management
│   ├── save-bookmark.tsx       # Save command
│   ├── search-bookmarks.tsx    # Search command
│   └── menu-bar.tsx            # Menu bar
├── metadata/                   # Screenshots
├── package.json                # Extension manifest
├── tsconfig.json              # TypeScript config
├── CHANGELOG.md               # Version history
└── README.md                  # User documentation
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Edit files in `src/`
- Follow existing code style
- Add TypeScript types
- Test your changes

### 3. Test Thoroughly

```bash
# Run linting
npm run lint

# Build for production
npm run build

# Test in Raycast
# Open each command and verify it works
```

### 4. Update Documentation

- Update README.md if needed
- Add entry to CHANGELOG.md
- Update code comments

### 5. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature"
```

**Commit Message Format:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build/tooling changes

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style

### TypeScript

- Use TypeScript for all files
- Define proper types and interfaces
- Avoid `any` type
- Use async/await over promises

### React

- Use functional components
- Use hooks for state management
- Follow Raycast component patterns
- Keep components focused and small

### Naming Conventions

- **Files**: kebab-case (`connect-device.tsx`)
- **Components**: PascalCase (`EditBookmarkForm`)
- **Functions**: camelCase (`getBookmarks`)
- **Constants**: UPPER_SNAKE_CASE (`BASE_URL`)

### Code Organization

```typescript
// 1. Imports
import { Action, ActionPanel } from "@raycast/api";
import { getBookmarks } from "./lib/api";

// 2. Types/Interfaces
interface Props {
  bookmark: Bookmark;
}

// 3. Component
export default function MyComponent({ bookmark }: Props) {
  // 4. Hooks
  const [state, setState] = useState();

  // 5. Functions
  async function handleAction() {
    // ...
  }

  // 6. Render
  return (
    // ...
  );
}
```

## Testing Guidelines

### Manual Testing

Test all commands:

- [ ] Search Bookmarks
- [ ] Save Bookmark
- [ ] Connect Device
- [ ] Manage Authentication
- [ ] Menu Bar

Test both auth methods:

- [ ] Device Connection
- [ ] API Token

Test error scenarios:

- [ ] No internet connection
- [ ] Invalid token
- [ ] Expired pairing code
- [ ] API errors

### Edge Cases

- Empty bookmark list
- Very long bookmark titles
- Special characters in URLs
- Network timeouts
- Rapid command switching

## API Changes

If you modify the API client (`src/lib/api.ts`):

1. Update TypeScript types
2. Test with real API
3. Handle errors gracefully
4. Update documentation
5. Test both auth methods

## UI/UX Guidelines

Follow Raycast's design principles:

### Action Panel

- Use Title Case for actions
- Add icons to actions
- Group related actions
- Add keyboard shortcuts
- Use ellipses (…) for submenus

### Lists

- Show loading states
- Provide empty states
- Use accessories for metadata
- Add search placeholders
- Keep titles concise

### Forms

- Add placeholders
- Validate input
- Show helpful errors
- Use appropriate field types
- Add descriptions

### Navigation

- Use Navigation API
- Set navigation titles
- Keep navigation shallow
- Provide back navigation

## Common Patterns

### API Requests

```typescript
try {
  const bookmarks = await getBookmarks();
  // Handle success
} catch (error) {
  await showToast({
    style: Toast.Style.Failure,
    title: "Failed to load bookmarks",
    message: String(error),
  });
}
```

### Loading States

```typescript
const { data, isLoading } = useCachedPromise(
  getBookmarks,
  [],
  { keepPreviousData: true }
);

return <List isLoading={isLoading}>...</List>;
```

### Empty States

```typescript
{items.length === 0 && !isLoading && (
  <List.EmptyView
    title="No bookmarks found"
    description="Try a different search or save a new bookmark"
  />
)}
```

## Debugging

### View Logs

```bash
# Raycast logs
tail -f ~/Library/Logs/Raycast/raycast.log

# Extension logs
console.log("Debug info:", data);
```

### Common Issues

**Extension not appearing:**

- Restart Raycast
- Check `npm run dev` is running
- Verify no build errors

**Changes not reflecting:**

- Save your files
- Check for TypeScript errors
- Restart `npm run dev`

**API errors:**

- Check authentication
- Verify API endpoint
- Check network connection

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No console.log statements
- [ ] TypeScript types defined
- [ ] Linting passes

### PR Description

Include:

- What changed
- Why it changed
- How to test
- Screenshots (if UI changes)
- Breaking changes (if any)

### Review Process

1. Automated checks run
2. Code review by maintainers
3. Feedback and iterations
4. Approval and merge

## Getting Help

- **Questions**: Ask in [#extensions channel](https://raycast.com/community)
- **Bugs**: Open a GitHub issue
- **Features**: Discuss in issues first
- **Docs**: Check [Raycast Docs](https://developers.raycast.com/)

## Resources

- [Raycast API Docs](https://developers.raycast.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Hooks](https://react.dev/reference/react)
- [Bucket API](../bucket-web/public/openapi.json)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn
- Follow community guidelines

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! 🎉**
