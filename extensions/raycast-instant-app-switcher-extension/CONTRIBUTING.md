# Contributing to Instant App Switcher

Thank you for your interest in contributing to Instant App Switcher! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Keep discussions professional

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

1. **Clear title** - Describe the issue briefly
2. **Steps to reproduce** - Detailed steps to recreate the bug
3. **Expected behavior** - What should happen
4. **Actual behavior** - What actually happens
5. **Environment** - macOS version, Raycast version
6. **Screenshots** - If applicable

### Suggesting Features

Feature requests are welcome! Please include:

1. **Problem description** - What problem does this solve?
2. **Proposed solution** - How should it work?
3. **Alternatives considered** - What other options did you think about?
4. **Use case** - When would you use this feature?

### Pull Requests

#### Before You Start

1. Check existing issues and PRs to avoid duplicates
2. For large changes, open an issue first to discuss
3. Fork the repository and create a branch from `master`

#### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/raycast-instant-app-switcher-extension.git
cd raycast-instant-app-switcher-extension

# Install dependencies
npm install

# Start development mode
npm run dev
```

#### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow code conventions**
   - Use TypeScript for type safety
   - Follow existing code style
   - Keep functions small and focused
   - Add comments for complex logic
   - Use meaningful variable names

3. **Test your changes**
   - Test manually in Raycast
   - Verify no regressions
   - Test edge cases
   - Check performance impact

4. **Keep commits focused**
   - One logical change per commit
   - Write clear commit messages
   - Use present tense ("Add feature" not "Added feature")

5. **Update documentation**
   - Update README.md if needed
   - Add inline code comments
   - Document new features

#### Commit Message Format

```
type: Short description (max 50 chars)

Longer explanation if needed (wrap at 72 chars).
Explain what and why, not how.

Fixes #123
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Build process, dependencies

Examples:
```
feat: Add multi-window app switching

Allow users to switch between specific windows of apps that have
multiple windows open (e.g., Chrome, Safari).

Fixes #45
```

#### Submitting a Pull Request

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

2. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request**
   - Use a clear title
   - Fill out the PR template
   - Reference related issues
   - Add screenshots for UI changes

4. **Address feedback**
   - Respond to review comments
   - Make requested changes
   - Push updates to your branch

## Development Guidelines

### Code Style

- **TypeScript**: Use proper types, avoid `any`
- **Naming**: Use camelCase for variables/functions, PascalCase for components
- **Async/Await**: Prefer over promises.then()
- **Error Handling**: Always handle errors gracefully
- **Performance**: Consider performance implications

### Project Structure

```
src/
  switch-apps.tsx    # Main extension logic
    - Utility functions first
    - React components next
    - Main component last
```

### Performance Considerations

- Keep app scanning under 50ms
- Cache when possible
- Avoid blocking UI operations
- Use efficient data structures

### Adding New Features

When adding features, consider:

1. **YAGNI Principle** - Only add what's needed now
2. **User Experience** - Keep it simple and fast
3. **Performance** - Don't slow down existing features
4. **Backwards Compatibility** - Don't break existing hotkeys/data
5. **Documentation** - Update README and comments

## Testing

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] App list displays correctly
- [ ] Search works (space + term)
- [ ] Hotkey assignment works
- [ ] Hotkey switching works instantly
- [ ] Hotkey removal works
- [ ] Conflict detection prevents invalid hotkeys
- [ ] Recent apps sorting is correct
- [ ] App icons display correctly
- [ ] No performance regressions

### Edge Cases to Test

- Apps with special characters in names
- Multiple apps with similar names
- Apps in non-standard locations
- Very long hotkey sequences
- Rapid switching between apps
- Empty state (no apps installed - unlikely but possible)

## Release Process

(For maintainers)

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release commit
4. Tag release: `git tag -a v1.0.0 -m "Release 1.0.0"`
5. Push: `git push --follow-tags`
6. Create GitHub release with notes

## Getting Help

- **Questions**: Open a discussion on GitHub
- **Issues**: Check existing issues first
- **Chat**: N/A (for now)

## Recognition

Contributors will be:
- Listed in release notes
- Mentioned in README (for significant contributions)
- Appreciated by the community!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Instant App Switcher! 🚀
