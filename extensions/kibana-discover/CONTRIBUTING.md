# Contributing to Kibana Discover Extension

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, constructive, and professional in all interactions.

## How to Contribute

### Reporting Issues

Before creating an issue:

1. **Search existing issues** to avoid duplicates
2. **Check the troubleshooting guide** in README.md
3. **Use the latest version** of the extension

When creating an issue, include:

- **Clear title** describing the problem
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Environment details**:
  - macOS version
  - Raycast version
  - Extension version
  - Kibana version
- **Screenshots** (if applicable)
- **Error messages** or console output

### Suggesting Features

Feature requests are welcome! Please:

1. Check if the feature already exists or is planned
2. Explain the use case and why it would be valuable
3. Provide examples of how it would work
4. Consider backward compatibility

### Pull Requests

We welcome pull requests! Please follow these guidelines:

#### Before You Start

1. **Open an issue** to discuss major changes
2. **Check existing PRs** to avoid duplicate work
3. **Read [DEVELOPMENT.md](DEVELOPMENT.md)** for setup instructions

#### PR Process

1. **Fork the repository**
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**:
   - Follow the code style (see below)
   - Add/update tests if applicable
   - Update documentation if needed
4. **Test thoroughly**:
   - Test with single and multiple instances
   - Test all affected features
   - Run `npm run lint` and fix any issues
5. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Follow conventional commits format (see below)
6. **Push to your fork**
7. **Open a pull request**:
   - Reference related issues
   - Describe what changed and why
   - Include screenshots for UI changes

#### PR Checklist

Before submitting:

- [ ] Code follows project style guidelines
- [ ] Ran `npm run lint` and fixed all issues
- [ ] Ran `npm run build` successfully
- [ ] Tested with single Kibana instance
- [ ] Tested with multiple Kibana instances
- [ ] Updated README.md if needed
- [ ] Updated CHANGELOG.md
- [ ] No hardcoded credentials or sensitive data
- [ ] All console.logs removed (except intentional debugging)

## Development Guidelines

### Code Style

#### TypeScript

- Use TypeScript for all code
- Define types in `src/types.ts`
- Avoid `any` type - use proper types
- Use interfaces for object shapes
- Export types that are used across files

**Example:**
```typescript
// Good
interface DataView {
  id: string;
  name: string;
  title: string;
}

// Avoid
const dataView: any = {...};
```

#### React

- Use functional components only
- Use hooks (`useState`, `useEffect`, etc.)
- Keep components small and focused
- Extract complex logic into custom hooks
- Props should be typed with interfaces

**Example:**
```typescript
interface MyComponentProps {
  title: string;
  onSubmit: (value: string) => void;
}

export function MyComponent({ title, onSubmit }: MyComponentProps) {
  const [value, setValue] = useState("");
  // ...
}
```

#### File Organization

- One component per file
- Name files after the component (PascalCase)
- Group related utilities in `src/tools/`
- Keep types in `src/types.ts`

#### Naming Conventions

- **Components**: PascalCase (`MyComponent`)
- **Functions**: camelCase (`fetchDataViews`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_FIELDS`)
- **Types/Interfaces**: PascalCase (`DataView`)
- **Files**: kebab-case for utilities, PascalCase for components

### Commit Messages

Use conventional commits format:

```
type(scope): description

[optional body]
[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(search): add keyboard shortcut for query input
fix(cache): handle missing cache file gracefully
docs(readme): update installation instructions
refactor(api): simplify Kibana API client
```

### Linting

Always run linting before committing:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run fix-lint
```

## Security

### Handling Credentials

- **Never hardcode** credentials in code
- **Never commit** credentials to git
- Use Raycast preferences for user credentials
- Document authentication methods clearly

### Reporting Security Issues

If you discover a security vulnerability:

1. **Do not open a public issue**
2. Email the maintainer directly
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Publishing to Raycast Store

If you're a maintainer publishing updates:

### Pre-Publishing Checklist

- [ ] All tests pass
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes with no errors
- [ ] Updated CHANGELOG.md with version and changes
- [ ] Updated version in package.json
- [ ] Metadata screenshots are correct size (2000x1250px)
- [ ] All assets in `assets/` folder are used
- [ ] README assets are outside `metadata/` folder
- [ ] No hardcoded credentials in examples
- [ ] Tested with fresh install
- [ ] Read [Raycast Extension Guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)

### Publishing

```bash
npm run publish
```

Follow the prompts from the Raycast CLI.

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

## Documentation

### README.md

User-focused documentation:
- How to install and configure
- How to use features
- Troubleshooting common issues
- FAQ

### DEVELOPMENT.md

Developer-focused documentation:
- Project structure
- Development setup
- Architecture overview
- Customization guide

### CONTRIBUTING.md

Contribution guidelines (this file):
- How to report issues
- How to submit PRs
- Code style and conventions
- Publishing process

### Code Comments

- Use comments for **why**, not **what**
- Document complex algorithms
- Explain non-obvious decisions
- Keep comments up-to-date

**Example:**
```typescript
// Good: Explains why
// Use rejectUnauthorized: false to support self-signed certificates
// in development environments
const agent = new https.Agent({ rejectUnauthorized: false });

// Avoid: States the obvious
// Create HTTPS agent
const agent = new https.Agent({ rejectUnauthorized: false });
```

## Testing

### Manual Testing

Before submitting PRs, test:

1. **Basic functionality**:
   - Refresh data views
   - Search and filter
   - Open in Discover
   - Copy actions

2. **Multi-instance support**:
   - Switch between instances
   - Different auth methods per instance
   - Custom fields per instance

3. **Configuration**:
   - Valid JSON config
   - Invalid JSON config
   - Missing required fields
   - Authentication failures

4. **Edge cases**:
   - Empty cache
   - No instances configured
   - Network errors
   - Invalid Kibana URLs

5. **UI/UX**:
   - Detail view toggle
   - Time range selection
   - Field selection
   - Query input form

### Test Coverage

While automated tests are welcome, manual testing is currently the primary method. When adding features:

1. Test the happy path
2. Test error conditions
3. Test edge cases
4. Test backward compatibility

## Migration Guide

When making breaking changes:

1. Document the breaking change in CHANGELOG.md
2. Provide migration instructions
3. Consider backward compatibility when possible
4. Update README.md with new behavior

**Example migration note:**
```markdown
## Breaking Changes

### v2.0.0

Configuration format changed from single instance to multi-instance array.

**Old format:**
```json
{
  "url": "https://kibana.example.com",
  "username": "elastic"
}
```

**New format:**
```json
[
  {
    "name": "Production",
    "url": "https://kibana.example.com",
    "username": "elastic"
  }
]
```

**Migration:** Wrap your existing config in an array and add a `name` field.
```

## Community

### Getting Help

- **Documentation**: Start with README.md and DEVELOPMENT.md
- **Issues**: Search existing issues or open a new one
- **Discussions**: Use GitHub Discussions for questions

### Staying Updated

- Watch the repository for notifications
- Check CHANGELOG.md for version updates
- Review merged PRs to see recent changes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing:

1. Check existing documentation
2. Search closed issues and PRs
3. Open a new issue with the `question` label

---

Thank you for contributing! 🎉
