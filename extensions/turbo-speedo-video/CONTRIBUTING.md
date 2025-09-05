# Contributing to Turbo Speedo Video

Thank you for your interest in contributing to Turbo Speedo Video! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- FFmpeg installed on your system
- Raycast (for testing)

### Development Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/turbo-speedo-video.git
   cd turbo-speedo-video
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Set up Raycast for development**
   - Open Raycast preferences
   - Go to Extensions → Developer
   - Click "Import Extension" and select your project folder

## Making Changes

### Branch Naming

Create a new branch for your changes:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
# or
git checkout -b docs/update-readme
```

### Code Style

- Follow the existing TypeScript/React patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Ensure all tests pass
- Follow the existing file structure

### Testing

- Write tests for new functionality
- Update existing tests if you modify behavior
- Ensure all tests pass before submitting

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Submitting Changes

### Pull Request Process

1. **Ensure your changes work**
   - All tests pass
   - Code builds successfully
   - Extension works in Raycast

2. **Update documentation**
   - Update README.md if needed
   - Add/update code comments
   - Update this file if you change the contribution process

3. **Create a Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Provide a detailed description of changes
   - Include screenshots for UI changes

### Pull Request Template

When creating a PR, please include:

- **Description**: What changes were made and why
- **Type**: Bug fix, feature, documentation, etc.
- **Testing**: How you tested the changes
- **Screenshots**: For UI changes
- **Breaking Changes**: If any

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS version, Raycast version, etc.
- **Screenshots**: If applicable

### Feature Requests

When requesting features, please include:

- **Description**: Clear description of the feature
- **Use Case**: Why this feature would be useful
- **Proposed Solution**: How you think it should work
- **Alternatives**: Other solutions you've considered

## Development Guidelines

### File Structure

```
src/
├── __tests__/          # Test files
├── utils/              # Utility functions
├── adjust-video-speed.tsx  # Main extension component
└── index.tsx           # Entry point
```

### Adding New Features

1. **Plan the feature**
   - Consider the user experience
   - Think about edge cases
   - Plan the API/interface

2. **Implement incrementally**
   - Start with basic functionality
   - Add tests as you go
   - Refactor and improve

3. **Test thoroughly**
   - Test with different video formats
   - Test edge cases (very large files, etc.)
   - Test error conditions

### Performance Considerations

- Video processing can be resource-intensive
- Consider file size limits
- Provide progress feedback for long operations
- Handle memory efficiently

## Questions?

- Open an issue for questions
- Check existing issues first
- Be specific about your question

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors list

Thank you for contributing to Turbo Speedo Video! 🚀
