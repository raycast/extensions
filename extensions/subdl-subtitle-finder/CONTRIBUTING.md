# Contributing to SubDL Subtitle Finder

Thank you for your interest in contributing to SubDL Subtitle Finder! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- [Raycast](https://raycast.com/) installed on macOS
- Git for version control
- A SubDL API key for testing

### Development Setup
1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/subdl-subtitle-finder-raycast.git
   cd subdl-subtitle-finder-raycast
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development mode:
   ```bash
   npm run dev
   ```

5. Configure API keys in Raycast preferences for testing

## 🛠️ Development Workflow

### Making Changes
1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards
3. Test thoroughly with `npm run dev`
4. Run linting and fix any issues:
   ```bash
   npm run lint
   npm run fix-lint
   ```

5. Commit with a descriptive message:
   ```bash
   git commit -m "feat: add new feature description"
   ```

6. Push to your fork and create a pull request

### Commit Convention
We use conventional commits for clear history:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## 🎯 What We're Looking For

### Priority Areas
- **Performance improvements**: API optimization, caching strategies
- **New subtitle sources**: Additional API integrations
- **Enhanced filtering**: More search and filter options
- **User experience**: UI/UX improvements and accessibility
- **Error handling**: Better error messages and recovery

### Feature Ideas
- Batch download functionality
- Subtitle preview before download
- Integration with media players
- Advanced search filters (year, genre, rating)
- Custom subtitle format preferences

## 📋 Code Standards

### TypeScript
- Use strict TypeScript configuration
- Provide proper type definitions
- Avoid `any` types when possible
- Use meaningful variable and function names

### Code Style
- Follow the existing ESLint configuration
- Use Prettier for consistent formatting
- Keep functions small and focused
- Add comments for complex logic

### Raycast Guidelines
- Follow [Raycast extension guidelines](https://developers.raycast.com/guidelines)
- Use appropriate Raycast UI components
- Implement proper loading and error states
- Provide meaningful action feedback

## 🧪 Testing

### Manual Testing
- Test all search functionality
- Verify download operations
- Check error handling scenarios
- Test with various API responses
- Validate across different macOS versions

### Areas to Test
- Search with various terms
- Language and quality filtering
- Download to different directories
- API key validation
- Network error scenarios
- Empty search results

## 📖 Documentation

When contributing, please:
- Update README.md if adding new features
- Add inline code comments for complex logic
- Update CHANGELOG.md following Keep a Changelog format
- Include setup instructions for new dependencies

## 🐛 Bug Reports

### Before Submitting
1. Check existing issues for duplicates
2. Test with the latest version
3. Verify it's not a configuration issue

### Include in Your Report
- Raycast version
- macOS version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Console logs if available
- Screenshots if relevant

## 💡 Feature Requests

### Good Feature Requests Include
- **Problem statement**: What problem does this solve?
- **Proposed solution**: How should it work?
- **Use cases**: When would users need this?
- **Implementation ideas**: Technical approach (optional)

## 🔧 API Guidelines

### SubDL API Usage
- Respect rate limits and implement proper delays
- Handle all error response codes gracefully
- Cache responses when appropriate
- Use environment variables for API keys in development

### Adding New APIs
- Ensure proper error handling
- Add configuration options in preferences
- Implement fallback mechanisms
- Document API requirements

## 📦 Release Process

### For Maintainers
1. Update version in `package.json`
2. Update `CHANGELOG.md` with new features and fixes
3. Create a new release tag
4. Submit updates to Raycast Store if needed

## 🤝 Community Guidelines

### Be Respectful
- Use welcoming and inclusive language
- Respect differing viewpoints and experiences
- Focus on constructive feedback
- Help newcomers get started

### Communication Channels
- **Issues**: Bug reports and feature requests
- **Pull Requests**: Code contributions and discussions
- **Discussions**: General questions and ideas

## 📚 Resources

### Helpful Links
- [Raycast API Documentation](https://developers.raycast.com/api-reference)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [SubDL API Documentation](https://subdl.com/api-doc)
- [Conventional Commits](https://www.conventionalcommits.org/)

### Learning Resources
- [Raycast Extension Examples](https://github.com/raycast/extensions)
- [React Hooks Guide](https://reactjs.org/docs/hooks-intro.html)
- [API Integration Best Practices](https://developers.raycast.com/examples/api)

---

Thank you for contributing to SubDL Subtitle Finder! 🎉 