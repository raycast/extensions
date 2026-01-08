Contributing to Eurobuch Search
Thank you for your interest in contributing! 🎉

Getting Started
Fork the repository
Clone your fork: git clone https://github.com/YOUR_USERNAME/eurobuch-search.git
Install dependencies: npm install
Start development: npm run dev
Development Workflow
Running the Extension
bash
npm run dev
This opens the extension in Raycast's development mode.

Running Tests
bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
Linting
bash
# Check for issues
npm run lint

# Auto-fix issues
npm run fix-lint
Making Changes
Branch Naming
feature/ - New features
fix/ - Bug fixes
docs/ - Documentation changes
refactor/ - Code refactoring
Example: feature/add-sorting-options

Commit Messages
Follow Conventional Commits:

feat: - New feature
fix: - Bug fix
docs: - Documentation
refactor: - Code refactoring
test: - Tests
chore: - Maintenance
Examples:

feat: add book condition filter
fix: handle ISBN-10 conversion edge case
docs: update README with new shortcuts
Code Style
Use TypeScript strict mode
Follow Raycast API conventions
Keep functions small and focused
Add comments for complex logic
Update tests for new features
Testing
Write tests for new features
Ensure all tests pass: npm test
Maintain >80% code coverage
Test with various ISBNs (ISBN-10, ISBN-13, with/without dashes)
Pull Request Process
Update Tests: Add/update tests for your changes
Update Documentation: Update README.md if needed
Update CHANGELOG: Add entry to CHANGELOG.md under [Unreleased]
Run Tests: Ensure npm test passes
Run Linter: Ensure npm run lint passes
Create PR: Open a pull request with clear description
PR Description Template
markdown
## What does this PR do?
Brief description of changes

## Why?
Explain the motivation

## How to test?
1. Step 1
2. Step 2

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Tests pass
- [ ] Linter passes
- [ ] Documentation updated
- [ ] CHANGELOG updated
Feature Ideas
Looking for ideas? Check out these:

 Filter by book condition (new, used, etc.)
 Sort options (price, title, dealer)
 Save favorite searches
 Export results to CSV
 Multi-currency support
 Price alerts
 Book comparison view
Questions?
📧 Open an issue
💬 Start a discussion
📖 Check existing issues/PRs
Code of Conduct
Be respectful and inclusive
Provide constructive feedback
Focus on the code, not the person
Help others learn and grow
License
By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🙏

