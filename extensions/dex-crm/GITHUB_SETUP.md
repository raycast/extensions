# GitHub Setup Guide

This guide will help you push your Dex CRM Raycast Extension to GitHub and set up continuous integration.

## Prerequisites

- Git installed and configured
- GitHub account
- Repository created on GitHub (or you'll create one below)

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository:
   - **Name**: `dex-raycast-extension`
   - **Description**: `Dex CRM extension for Raycast - Search, manage contacts, and reminders`
   - **Visibility**: Public or Private (your choice)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)

## Step 2: Push to GitHub

```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/dex-raycast-extension.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Configure GitHub Secrets (Optional)

If you want to use Codecov for code coverage:

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add: `CODECOV_TOKEN` (get this from https://codecov.io/)

## Step 4: Verify CI/CD

1. Go to **Actions** tab in your GitHub repository
2. You should see the CI workflow running
3. It will:
   - Run ESLint
   - Run tests with coverage
   - Build the extension
   - Type-check with TypeScript

## Step 5: Update README Badges

Replace `YOUR_USERNAME` in README.md:

```markdown
[![CI](https://github.com/YOUR_USERNAME/dex-raycast-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/dex-raycast-extension/actions/workflows/ci.yml)
```

## Next Steps

### For Public Release

If you plan to publish to the Raycast Store:

1. **Update package.json**:
   - Change `author` from `your-raycast-username` to your actual Raycast username

2. **Create Raycast Account**:
   - Visit [raycast.com](https://www.raycast.com/)
   - Sign up if you haven't already

3. **Publish to Store**:
   ```bash
   npm run publish
   ```

### For Private Use

If you want to keep it private:

1. Make sure your repository is set to Private
2. Share access with specific collaborators if needed
3. Install locally on your machines using the built extension

## Continuous Integration

The CI workflow (`.github/workflows/ci.yml`) runs on:

- Every push to `main` or `develop` branches
- Every pull request to `main` or `develop` branches

### CI Jobs

1. **Lint**: Runs ESLint to check code quality
2. **Test**: Runs Jest tests with coverage report
3. **Build**: Builds the extension
4. **Type Check**: Runs TypeScript compiler

## Branch Protection (Recommended)

For team collaboration, set up branch protection:

1. Go to **Settings** → **Branches**
2. Add rule for `main` branch
3. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select: `lint`, `test`, `build`, `type-check`

## Troubleshooting

### CI Failing

**Issue**: Tests fail in CI but work locally

**Solution**: Make sure all dependencies are in `package.json` and run:

```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

**Issue**: Linting fails in CI

**Solution**: Run locally and fix:

```bash
npm run lint
npm run fix-lint
```

### Push Rejected

**Issue**: `! [rejected] main -> main (fetch first)`

**Solution**: Pull first, then push:

```bash
git pull origin main --rebase
git push origin main
```

## Maintenance

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Update package.json
npx npm-check-updates -u
npm install
```

### Running Tests Before Push

Tests automatically run via pre-commit hook, but you can manually run:

```bash
npm test                # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
```

## Support

For issues:

- Check [GitHub Issues](https://github.com/YOUR_USERNAME/dex-raycast-extension/issues)
- Review [CI logs](https://github.com/YOUR_USERNAME/dex-raycast-extension/actions)
- See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines

---

🎉 **Congratulations!** Your Dex CRM Raycast Extension is now on GitHub with full CI/CD!
