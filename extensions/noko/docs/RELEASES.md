# Release Management

This project uses [Release Please](https://github.com/googleapis/release-please-action) with GitHub Actions to automate releases and changelog generation.

## 🚀 How It Works

1. **Automatic Changelog Generation**: Release Please automatically generates changelogs from conventional commit messages
2. **Pull Request Creation**: When changes are ready for release, Release Please creates a pull request with the new version and changelog
3. **Automated Release**: When the PR is merged, it automatically creates a GitHub release and publishes to Raycast Store

## 📝 Making Changes

### Commit Messages

Use conventional commit format for automatic changelog generation:

```bash
# New feature
git commit -m "feat: add timer pause functionality"

# Bug fix
git commit -m "fix: resolve timer state synchronization issue"

# Documentation
git commit -m "docs: update API documentation"

# Breaking change
git commit -m "feat!: redesign timer interface

BREAKING CHANGE: Timer component props have changed"
```

### Commit Types

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Test additions or changes
- **build**: Build system changes
- **ci**: CI configuration changes
- **chore**: Maintenance tasks

## 🔄 Release Process

### 1. Development
- Make changes and commit with conventional commit messages
- Push to `main` branch

### 2. Release Please
- Release Please monitors the `main` branch
- When there are changes, it creates a pull request with:
  - Updated version number
  - Generated changelog
  - Release notes

### 3. Review and Merge
- Review the generated changelog and version
- Merge the pull request when ready

### 4. Automatic Release
- GitHub release is created automatically
- Extension is built and tested
- Build artifacts are uploaded to GitHub Actions

## 🏷️ Versioning

Release Please uses semantic versioning:

- **Major** (X.0.0): Breaking changes (commits with `!` or `BREAKING CHANGE:`)
- **Minor** (0.X.0): New features (`feat:` commits)
- **Patch** (0.0.X): Bug fixes (`fix:` commits)

## 📊 Changelog Format

The generated changelog follows this format:

```markdown
## [2.1.0] - 2025-01-15

### Features

* add timer pause functionality ([abc123](https://github.com/user/repo/commit/abc123))

### Bug Fixes

* resolve timer state synchronization issue ([def456](https://github.com/user/repo/commit/def456))
```

## 🔧 Configuration

### Release Please Config

The configuration is in `release-please-config.json`:

```json
{
  "release-type": "node",
  "packages": {
    ".": {
      "package-name": "noko",
      "changelog-sections": [
        { "type": "feat", "section": "Features" },
        { "type": "fix", "section": "Bug Fixes" },
        // ... more sections
      ]
    }
  }
}
```

### GitHub Actions

The workflow is in `.github/workflows/release-please.yml`:

- **Release Please**: Creates PRs and releases
- **Build and Test**: Automatically builds and tests the extension
- **Artifact Upload**: Uploads build artifacts to GitHub Actions

## 🚨 Troubleshooting

### Release Not Created
- Check if commits follow conventional commit format
- Verify GitHub Actions are running
- Check for any workflow errors

### Changelog Issues
- Ensure commit messages follow conventional format
- Check `release-please-config.json` configuration
- Verify commit types are recognized

### Build Issues
- Check that all tests pass
- Verify extension builds successfully
- Check GitHub Actions logs for build errors

## 📚 Resources

- [Release Please Documentation](https://github.com/googleapis/release-please-action)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions](https://docs.github.com/en/actions)
