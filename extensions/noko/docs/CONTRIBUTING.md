# Contributing to Noko Raycast Extension

Thank you for your interest in contributing to the Noko Raycast extension! This guide will help you get started with contributing to the project.

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **🐛 Bug Reports** - Report issues you've found
- **✨ Feature Requests** - Suggest new functionality
- **📝 Documentation** - Improve or add documentation
- **🔧 Code Contributions** - Fix bugs or implement features
- **🧪 Testing** - Help improve test coverage
- **🎨 UI/UX Improvements** - Enhance the user experience

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/your-username/noko-for-raycast.git
cd noko-for-raycast

# Add the original repository as upstream
git remote add upstream https://github.com/JuanVqz/noko-for-raycast.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Development Environment

Follow the [Development Guide](development.md) to set up your development environment.

### 4. Create a Branch

```bash
# Create a new branch for your contribution
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Use strict TypeScript with proper typing
- **React**: Follow React best practices and hooks patterns
- **Naming**: Use descriptive, clear names for variables and functions
- **Comments**: Add comments for complex logic
- **Formatting**: Use Prettier for consistent code formatting

### File Organization

```
src/
├── components/     # UI Components
├── views/         # View Components
├── hooks/         # Custom React hooks
├── lib/           # Shared utilities
├── types.ts       # TypeScript definitions
├── constants.ts   # Application constants
├── utils.ts       # Utility functions
└── timers.tsx     # Main command
```

### Component Guidelines

- **Single Responsibility**: Each component should have one clear purpose
- **Props Interface**: Define clear TypeScript interfaces for props
- **Memoization**: Use `memo`, `useMemo`, and `useCallback` appropriately
- **Error Handling**: Wrap components in ErrorBoundary when needed

### Hook Guidelines

- **Custom Hooks**: Create reusable hooks for complex logic
- **Dependencies**: Properly manage hook dependencies
- **Error Handling**: Include error handling in hooks
- **Loading States**: Provide loading states for async operations

## 🧪 Testing

### Manual Testing

1. **Test All Features**

   - Start/stop timers
   - Create entries
   - View entries
   - Error scenarios

2. **Test Different Scenarios**

   - No internet connection
   - Invalid API token
   - API errors
   - Edge cases

3. **Test User Experience**
   - Navigation flow
   - Keyboard shortcuts
   - Loading states
   - Error messages

### Automated Testing

```bash
# Run linting
npm run lint

# Fix linting issues
npm run fix-lint

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

## 📝 Pull Request Process

### Before Submitting

1. **Test Your Changes**

   - Ensure all functionality works correctly
   - Test edge cases and error scenarios
   - Verify no regressions

2. **Code Quality**

   - Run `npm run lint` and fix any issues
   - Run `npm run fix-lint` to auto-fix issues
   - Run `npm run test` to ensure tests pass

3. **Documentation**
   - Update documentation if needed
   - Add comments for complex code
   - Update README if adding new features

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Manual testing completed
- [ ] All existing tests pass
- [ ] New tests added (if applicable)

## Screenshots (if applicable)

Add screenshots to help explain your changes

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated Checks**

   - TypeScript compilation
   - Linting
   - Test execution

2. **Manual Review**

   - Code quality and style
   - Functionality testing
   - Documentation updates

3. **Feedback**
   - Address review comments
   - Make requested changes
   - Respond to questions

## 🐛 Bug Reports

### Before Reporting

1. **Check Existing Issues**

   - Search for similar issues
   - Check if already reported

2. **Gather Information**
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Screenshots/logs

### Bug Report Template

```markdown
## Bug Description

Clear description of the bug

## Steps to Reproduce

1. Go to '...'
2. Click on '....'
3. See error

## Expected Behavior

What you expected to happen

## Actual Behavior

What actually happened

## Environment

- macOS Version:
- Raycast Version:
- Extension Version:
- Node.js Version:

## Additional Context

Any other relevant information
```

## ✨ Feature Requests

### Before Requesting

1. **Check Existing Requests**

   - Search for similar feature requests
   - Check if already planned

2. **Consider Alternatives**
   - Is there a workaround?
   - Could existing features be enhanced?

### Feature Request Template

```markdown
## Feature Description

Clear description of the feature

## Use Case

Why would this feature be useful?

## Proposed Solution

How should this feature work?

## Alternatives Considered

What other solutions have you considered?

## Additional Context

Any other relevant information
```

## 🏷️ Commit Guidelines

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```
feat(timer): add pause/resume functionality
fix(api): handle empty response from Noko API
docs(readme): update installation instructions
refactor(components): extract common timer logic
```

## 🎯 Development Priorities

### High Priority

- Bug fixes
- Performance improvements
- Security updates
- Accessibility improvements

### Medium Priority

- New features
- UI/UX enhancements
- Documentation improvements
- Code refactoring

### Low Priority

- Nice-to-have features
- Minor UI tweaks
- Additional documentation

## 🆘 Getting Help

### Resources

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Raycast Community**: For Raycast-specific questions
- **Noko Support**: For Noko API questions

### Communication

- **Be Respectful**: Treat everyone with respect
- **Be Patient**: Maintainers are volunteers
- **Be Clear**: Provide clear, detailed information
- **Be Helpful**: Help others when you can

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT License).

## 🙏 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing to the Noko Raycast extension! 🎉
