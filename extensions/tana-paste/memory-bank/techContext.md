# Technical Context

## Technologies Used

### Raycast Extension
- **TypeScript**: Core programming language with strict typing
- **React**: UI components for the paste-and-edit interface
- **Raycast API**: Integration with clipboard, notifications, and UI
- **Jest**: Unit testing framework
- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting

### Python Script
- **Python 3.6+**: Alternative implementation for large files
- **Core Python Libraries**: No external dependencies required

## Development Setup
```bash
# Clone repository
git clone https://github.com/yourusername/tana-paste.git
cd tana-paste

# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Technical Constraints
- **Raycast Extension Limitations**:
  - Maximum clipboard size handling
  - UI rendering constraints
  - Performance considerations for large documents
- **Tana Format Requirements**:
  - Specific syntax for nodes (`- !!` for headings)
  - Field format requirements (`key::value`)
  - Indentation for hierarchy
  - Special handling for dates, links, etc.
- **Performance Considerations**:
  - Large document handling (delegated to Python script)
  - Regex optimization for parsing
  - Memory efficient transformation

## Dependencies
- **@raycast/api**: ^1.94.3 - Raycast extension framework
- **Development Dependencies**:
  - TypeScript: ^5.8.2
  - ESLint: ^9.23.0
  - Jest: ^29.7.0
  - Various TypeScript and test utilities

## Deployment Process
- **Extension Development**:
  1. Run `npm run dev` to start development mode
  2. Test changes in Raycast
  3. Run tests with `npm test`
  4. Run `npm run build` before committing changes to ensure code is formatted, linted, and tests pass
- **Extension Publishing**:
  1. Ensure tests pass: `npm run build`
  2. Publish to Raycast: `npm run publish`
- **Python Script Distribution**:
  - Script is distributed as a standalone file
  - No installation required beyond Python 3.6+

## Testing Strategy
- **Unit Tests**: Core conversion logic tested with Jest
- **Integration Tests**: End-to-end conversion tests
- **Manual Testing**: Complex edge cases and user workflow verification

## GitHub Workflow

### Issue Management
- Create detailed GitHub issues with implementation requirements
- Use issue templates for consistency
- Include acceptance criteria in each issue
- Tag issues with appropriate labels (feature, bug, enhancement)
- Link issues to milestones and projects

### Branch Strategy
- Branch naming convention: `issue-{number}-{descriptive-name}`
- Feature branches created from `main` branch
- Short-lived branches preferred to minimize merge conflicts

### Commit Guidelines
- Follow commit message format: `{type}: {message} #{issue-number}`
- Types include: feat, fix, docs, style, refactor, test, chore
- Reference issues in commit messages for traceability
- Run `npm run build` before committing to ensure code is formatted, linted, and tests pass

### Pull Request Process
1. Create a pull request linking to the relevant issue
2. Ensure all tests pass in CI pipeline
3. Update README.md with any new features or changes
4. Update CHANGELOG.md following semantic versioning
5. Request review from team members
6. After approval, merge PR to close issue

### CI/CD Pipeline
- Automatic test runs on pull requests
- Lint checks for code quality
- Build verification for TypeScript compilation
- Version bump enforcement before merging to main 