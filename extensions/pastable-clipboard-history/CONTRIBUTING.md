# Contributing to Second Last Clipboard

Thank you for your interest in contributing to the Second Last Clipboard Raycast extension! 🎉

## 🚀 Getting Started

### Prerequisites
- **Node.js** 16.10 or higher
- **npm** 7.0 or higher
- **Raycast** app installed on macOS
- **Git** for version control

### Development Setup
1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/second-last-clipboard.git
   cd second-last-clipboard
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start development mode**:
   ```bash
   npm run dev
   ```
5. **Open Raycast** to test your changes

## 📝 How to Contribute

### 🐛 Reporting Bugs
1. **Check existing issues** to avoid duplicates
2. **Use the bug report template** when creating new issues
3. **Include detailed information**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Raycast version and macOS version
   - Extension version
   - Error messages or screenshots

### 💡 Suggesting Features
1. **Check the roadmap** in README.md
2. **Open a feature request** with:
   - Clear description of the feature
   - Use case and benefits
   - Possible implementation approach
   - Mockups or examples (if applicable)

### 🔧 Code Contributions

#### Types of Contributions Welcome
- **Bug fixes**
- **Feature implementations**
- **Performance improvements**
- **Code quality improvements**
- **Documentation updates**
- **Test coverage improvements**

#### Development Workflow
1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes** following our coding standards
3. **Test thoroughly** with various clipboard scenarios
4. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add keyboard navigation to history viewer"
   ```
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request**

## 📋 Coding Standards

### Code Style
- **Follow ESLint configuration** (runs automatically)
- **Use Prettier formatting** (configured in the project)
- **Write TypeScript** with proper type annotations
- **Follow React best practices** with functional components and hooks

### Commit Messages
Use [Conventional Commits](https://www.conventionalcommits.org/) format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

### Code Quality Checklist
- [ ] Code follows TypeScript best practices
- [ ] All functions have proper error handling
- [ ] User-facing messages are clear and helpful
- [ ] No console.log statements in production code
- [ ] Code is properly formatted with Prettier
- [ ] ESLint passes without warnings

## 🧪 Testing

### Manual Testing Checklist
Before submitting a PR, test these scenarios:

#### Quick Paste Command
- [ ] Works with empty clipboard history
- [ ] Works with only one clipboard item
- [ ] Works with multiple clipboard items
- [ ] Shows appropriate error messages
- [ ] HUD confirmation displays correctly

#### History Viewer
- [ ] Loads clipboard history correctly
- [ ] Search functionality works
- [ ] Paste action works from history
- [ ] Copy action works from history
- [ ] Refresh functionality works
- [ ] Empty state displays correctly

#### Edge Cases
- [ ] Very long clipboard content
- [ ] Special characters and Unicode
- [ ] Whitespace-only clipboard items
- [ ] Network/API errors

## 📚 Documentation

### When to Update Documentation
- Adding new features
- Changing existing behavior
- Fixing bugs that affect user experience
- Adding new configuration options

### Documentation Types
- **README.md**: User-facing documentation
- **Code comments**: Complex logic explanations
- **Type definitions**: Clear interface documentation
- **CHANGELOG.md**: Version history (if applicable)

## 🎯 Pull Request Guidelines

### Before Submitting
- [ ] Branch is up to date with main
- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages are clear

### Pull Request Template
When opening a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Testing
- [ ] Tested manually
- [ ] All scenarios covered
- [ ] Edge cases considered

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes
```

## 🔄 Review Process

### What to Expect
1. **Automated checks** run on all PRs
2. **Manual review** by maintainers
3. **Feedback** and requested changes
4. **Approval** and merge

### Review Criteria
- **Functionality**: Does it work as intended?
- **Code Quality**: Is it maintainable and readable?
- **User Experience**: Does it improve the extension?
- **Performance**: Does it impact extension speed?
- **Compatibility**: Works with Raycast API requirements?

## 🤝 Community Guidelines

### Be Respectful
- Use welcoming and inclusive language
- Respect differing viewpoints and experiences
- Give and accept constructive feedback gracefully
- Focus on what's best for the community

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code review and collaboration

## 🎉 Recognition

Contributors will be:
- **Listed in CONTRIBUTORS.md** (if we create one)
- **Mentioned in release notes** for significant contributions
- **Tagged in social media** announcements (with permission)

## ❓ Questions?

If you have any questions about contributing:
1. **Check existing documentation** first
2. **Search closed issues** for similar questions
3. **Open a GitHub Discussion** for general questions
4. **Open an issue** for specific problems

Thank you for contributing to Second Last Clipboard! 🚀 