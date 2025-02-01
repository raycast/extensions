# Contributing to MuteDeck Raycast Extension

Thank you for your interest in contributing to the MuteDeck Raycast extension! This document provides guidelines and instructions for development.

## Development Setup

### Prerequisites

- Node.js 16 or later
- npm 7 or later
- Raycast installed
- MuteDeck installed
- Git

### Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/mutedeck-raycast-extension.git
   cd mutedeck-raycast-extension
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development:
   ```bash
   npm run dev
   ```

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Keep functions small and focused
- Add type definitions for all parameters
- Document complex logic

### Command Structure

- One command per file
- Place commands in `src/commands/`
- Use consistent naming
- Include command metadata
- Add keyboard shortcut hints

### Error Handling

- Validate inputs
- Provide clear error messages
- Include recovery steps
- Handle edge cases
- Add user guidance

### Testing

- Test all commands
- Verify error states
- Check performance
- Validate UX flows
- Test keyboard shortcuts

## Pull Request Process

1. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our guidelines

3. Update documentation as needed

4. Run quality checks:

   ```bash
   npm run lint
   npm run build
   ```

5. Submit a pull request:
   - Use a clear title
   - Describe your changes
   - Reference any issues
   - Add screenshots if relevant

## Release Process

1. Version bump:

   - Update version in package.json
   - Update CHANGELOG.md
   - Create release notes

2. Build and test:

   ```bash
   npm run build
   # Test the built extension
   ```

3. Create a release:
   - Tag the version
   - Add release notes
   - Include any migration steps

## Questions?

- Open an issue for bugs
- Start a discussion for features
- Join our community for help
