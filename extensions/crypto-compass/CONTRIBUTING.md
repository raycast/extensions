# 🤝 Contributing to CryptoCompass

Thank you for your interest in contributing to CryptoCompass! This document provides guidelines and information for contributors.

## 🎯 How to Contribute

### Types of Contributions
- **🐛 Bug Reports**: Help us identify and fix issues
- **✨ Feature Requests**: Suggest new functionality
- **📚 Documentation**: Improve guides and examples
- **🔧 Code Changes**: Fix bugs or add features
- **🎨 UI/UX Improvements**: Enhance the user experience
- **🚀 Performance**: Optimize speed and efficiency

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Raycast installed on your Mac
- Basic knowledge of TypeScript and React

### Setup
1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/cryptocompass.git
   cd cryptocompass
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Start development**
   ```bash
   npm run dev
   ```

## 🔧 Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes
- Write clean, readable code
- Follow the existing code style
- Add comments for complex logic
- Update documentation if needed

### 3. Test Your Changes
```bash
npm run build    # Build the extension
npm run lint     # Check code quality
npm run dev      # Test in development mode
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat: add new cryptocurrency support"
```

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

## 📝 Code Style Guidelines

### TypeScript
- Use strict type checking
- Prefer interfaces over types for objects
- Use meaningful variable and function names
- Add JSDoc comments for public functions

### React
- Use functional components with hooks
- Keep components small and focused
- Use proper prop types and interfaces
- Follow React best practices

### General
- Use consistent indentation (2 spaces)
- Keep line length under 100 characters
- Use meaningful commit messages
- Follow conventional commit format

## 🎨 Adding New Cryptocurrencies

### 1. Update `src/slip44.ts`
```typescript
{
  coinType: 194081, // Use next available ID
  name: "new-coin",
  symbol: "NEW",
  aliases: ["new", "new coin", "new network"],
  tokenStandards: ["NEW-20"], // If applicable
  networkType: "mainnet",
  decimals: 18
}
```

### 2. Add Testnet Version (if applicable)
```typescript
{
  coinType: 194082,
  name: "new-coin-testnet",
  aliases: ["new testnet", "new test"],
  tokenStandards: ["NEW-20"],
  networkType: "testnet",
  decimals: 18
}
```

### 3. Test Your Addition
- Search for the new coin by name
- Verify decimal conversion works
- Check that testnet filtering works

## 🧪 Testing Guidelines

### Manual Testing
- Test all search functionality
- Verify decimal conversions
- Check price fetching
- Test with different network types

### Code Quality
- Run linting: `npm run lint`
- Fix any warnings or errors
- Ensure TypeScript compilation succeeds
- Test build process: `npm run build`

## 📚 Documentation

### Update These Files
- **README.md**: Add new features and examples
- **CHANGELOG.md**: Document changes and additions
- **API Documentation**: Update if adding new APIs

### Documentation Standards
- Use clear, concise language
- Include practical examples
- Add screenshots for UI changes
- Keep information up-to-date

## 🐛 Bug Reports

### Before Reporting
1. Check existing issues
2. Try to reproduce the problem
3. Test with different inputs
4. Check console for errors

### Bug Report Template
```markdown
**Description**
Brief description of the issue

**Steps to Reproduce**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: macOS version
- Raycast: version
- Extension: version

**Additional Information**
Screenshots, logs, or other details
```

## ✨ Feature Requests

### Feature Request Template
```markdown
**Feature Description**
Brief description of the requested feature

**Use Case**
How would this feature be used?

**Proposed Implementation**
Any ideas on how to implement it?

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Any other relevant information
```

## 🚀 Pull Request Process

### Before Submitting
1. **Test thoroughly** - Ensure everything works
2. **Update documentation** - Keep docs in sync
3. **Follow style guidelines** - Match existing code
4. **Write clear commit messages** - Use conventional format

### PR Guidelines
- **Title**: Clear, descriptive title
- **Description**: Explain what and why, not how
- **Screenshots**: Include for UI changes
- **Testing**: Describe how you tested
- **Breaking Changes**: Note if any

### Review Process
1. **Automated Checks**: CI/CD must pass
2. **Code Review**: Maintainers review code
3. **Testing**: Verify functionality works
4. **Merge**: Approved changes are merged

## 🏷️ Commit Message Format

Use conventional commit format:
```
type(scope): description

feat: add new cryptocurrency support
fix: resolve decimal conversion issue
docs: update README with new features
style: format code according to guidelines
refactor: improve search algorithm
test: add tests for new functionality
chore: update dependencies
```

## 📞 Getting Help

### Questions?
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Email**: your.email@example.com

### Need Help?
- Check existing documentation
- Look at similar issues/PRs
- Ask in GitHub Discussions
- Reach out to maintainers

## 🙏 Recognition

Contributors will be recognized in:
- **README.md**: Contributors section
- **CHANGELOG.md**: For significant contributions
- **GitHub**: Contributors tab and releases

## 📋 Checklist for Contributors

- [ ] Code follows style guidelines
- [ ] Tests pass and new tests added
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Commit messages follow convention
- [ ] PR description is clear and complete

---

**Thank you for contributing to CryptoCompass! 🧭**

Your contributions help make this tool better for everyone in the crypto community.
