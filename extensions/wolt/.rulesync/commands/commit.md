---
description: "Create well-formatted commits with conventional commit messages"
targets: ["*"]
---

Unless specified with `--no-verify`, automatically runs pre-commit checks:

- `pnpm build` to verify the build succeeds

Check which files are staged with `git status`.

If 0 files are staged, automatically add all modified and new files with `git add`.

Perform a `git diff` to understand what changes are being committed.

Analyze the diff to determine if multiple distinct logical changes are present.

If multiple distinct changes are detected, suggest breaking the commit into multiple smaller commits.

For each commit (or the single commit if not split), create a commit message using conventional commit format without emojis.

## Best Practices for Commits

- **Verify before committing**: Ensure code builds correctly
- **Atomic commits**: Each commit should contain related changes that serve a single purpose
- **Split large changes**: If changes touch multiple concerns, split them into separate commits
- **Conventional commit format**: Use the format `<type>: <description>` where type is one of:
  - `feat`: A new feature
  - `fix`: A bug fix
  - `docs`: Documentation changes
  - `style`: Code style changes (formatting, etc)
  - `refactor`: Code changes that neither fix bugs nor add features
  - `perf`: Performance improvements
  - `test`: Adding or fixing tests
  - `chore`: Changes to the build process, tools, etc.
  - `ci`: CI/CD improvements
  - `revert`: Reverting changes
  - `db`: Database related changes
  - `experiment`: Perform experiments
  - `ui`: UI changes
  - `assets`: Add or update assets
- **Present tense, imperative mood**: Write commit messages as commands (e.g., "add feature" not "added feature")
- **Concise first line**: Keep the first line under 72 characters

## Guidelines for Splitting Commits

When analyzing the diff, consider splitting commits based on these criteria:

1. **Different concerns**: Changes to unrelated parts of the codebase
2. **Different types of changes**: Mixing features, fixes, refactoring, etc.
3. **File patterns**: Changes to different types of files (e.g., source code vs documentation)
4. **Logical grouping**: Changes that would be easier to understand or review separately
5. **Size**: Very large changes that would be clearer if broken down

## Examples

Good commit messages:

- `feat: add user authentication system`
- `fix: resolve memory leak in rendering process`
- `docs: update API documentation with new endpoints`
- `refactor: simplify error handling logic in parser`
- `fix: resolve linter warnings in component files`
- `chore: improve developer tooling setup process`
- `feat: implement business logic for transaction validation`
- `fix: address minor styling inconsistency in header`
- `fix: patch critical security vulnerability in auth flow`
- `style: reorganize component structure for better readability`
- `fix: remove deprecated legacy code`
- `feat: add input validation for user registration form`
- `fix: resolve failing CI pipeline tests`
- `feat: implement analytics tracking for user engagement`
- `fix: strengthen authentication password requirements`
- `feat: improve form accessibility for screen readers`

Example of splitting commits:

- First commit: `feat: add new solc version type definitions`
- Second commit: `docs: update documentation for new solc versions`
- Third commit: `chore: update package.json dependencies`
- Fourth commit: `feat: add type definitions for new API endpoints`
- Fifth commit: `feat: improve concurrency handling in worker threads`
- Sixth commit: `fix: resolve linting issues in new code`
- Seventh commit: `test: add unit tests for new solc version features`
- Eighth commit: `fix: update dependencies with security vulnerabilities`

## Dos and Don'ts

### Dos

✅ **Do** write clear, descriptive commit messages that explain what and why
✅ **Do** use conventional commit format (`type: description`)
✅ **Do** keep commit messages concise but informative
✅ **Do** split large changes into multiple atomic commits
✅ **Do** verify builds pass before committing (unless using `--no-verify`)
✅ **Do** review the diff before committing to ensure accuracy
✅ **Do** use present tense, imperative mood ("add feature" not "added feature")
✅ **Do** group related changes together in a single commit
✅ **Do** ensure each commit represents a complete, working state

### Don'ts

❌ **Don't** use emojis in commit messages
❌ **Don't** write vague commit messages like "fix stuff" or "update"
❌ **Don't** mix unrelated changes in a single commit
❌ **Don't** commit broken code (unless explicitly working on a fix)
❌ **Don't** commit commented-out code or debug statements
❌ **Don't** commit large generated files or build artifacts
❌ **Don't** use past tense ("fixed bug" should be "fix bug")
❌ **Don't** write commit messages longer than 72 characters for the first line
❌ **Don't** skip reviewing the diff before committing
❌ **Don't** commit sensitive information (API keys, passwords, etc.)

## Command Options

- `--no-verify`: Skip running the pre-commit checks (build)

## Important Notes

- By default, pre-commit checks (`pnpm build`) will run to ensure code quality
- If these checks fail, ask if the user wants to proceed with the commit anyway or fix the issues first
- If specific files are already staged, only commit those files
- If no files are staged, automatically stage all modified and new files
- The commit message will be constructed based on the changes detected
- Before committing, review the diff to identify if multiple commits would be more appropriate
- If suggesting multiple commits, help stage and commit the changes separately
- Always review the commit diff to ensure the message matches the changes
