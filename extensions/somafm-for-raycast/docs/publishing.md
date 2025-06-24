# Publishing Guide

This guide explains how to publish the SomaFM extension to the Raycast Store.

## Pre-Publishing Checklist

### ✅ Required Files
- [x] `package.json` with proper metadata
- [x] `extension-icon.png` (512x512px)
- [x] `README.md` with usage instructions
- [x] `CHANGELOG.md` with version history
- [x] Categories in package.json ("Media", "Music")
- [ ] Screenshots in `metadata/` folder (3-6 screenshots, 2000x1250px)

### 📸 Taking Screenshots

1. **Set up Window Capture**
   - Open Raycast Preferences → Advanced
   - Set a keyboard shortcut for Window Capture

2. **Build the extension**
   ```bash
   npm run build
   ```

3. **Capture screenshots**
   - Open Raycast and navigate to the extension
   - Use Window Capture shortcut (removes dev icon)
   - Save as PNG in `metadata/` folder
   - See `metadata/screenshot-guidelines.md` for suggestions

### 🔍 Validation

Run these commands before publishing:

```bash
# Build the extension
npm run build

# Run tests
npm test

# Check linting
npm run lint

# Validate with Raycast CLI
npx @raycast/api@latest validate
```

## Publishing Process

### Option 1: Manual Publishing (Recommended)

1. **Ensure all files are ready**
   - Screenshots in `metadata/`
   - Update CHANGELOG.md with actual date
   - Commit all changes

2. **Run the publish command**
   ```bash
   npm run publish
   ```

3. **Follow the browser prompts**
   - Authenticate with GitHub
   - The command will fork raycast/extensions
   - Create a PR automatically
   - Copy the PR link

4. **Wait for review**
   - Raycast team will review your PR
   - They may request changes
   - Once approved, it's published!

### Option 2: GitHub Actions (CI/CD)

We've set up two workflows:

1. **Validation Workflow** (`.github/workflows/validate.yml`)
   - Runs on every push and PR
   - Validates extension structure
   - Runs tests and linting
   - Ensures extension is ready for publishing

2. **Publishing Workflow** (`.github/workflows/publish.yml`)
   - Runs on push to main
   - Validates the extension
   - Shows reminder for manual publishing
   - (Actual publishing requires manual step due to auth)

## Store Submission Tips

1. **Icon Quality**
   - Ensure your icon looks good on both light/dark themes
   - Avoid using the default Raycast icon

2. **Screenshots**
   - Show key features in action
   - Include variety (grid/list views, menu bar, etc.)
   - Highlight unique features like now playing info

3. **Description**
   - Keep it concise but informative
   - Mention key features
   - Include any requirements (media players)

4. **Categories**
   - We've chosen "Media" and "Music"
   - These help users discover your extension

## After Publishing

1. **Monitor the PR**
   - Respond to reviewer feedback promptly
   - Make requested changes

2. **Update your extension**
   - Future updates follow the same process
   - Update CHANGELOG.md with new changes
   - Increment version in package.json

3. **Share your extension**
   - Once published, share the Raycast Store link
   - Consider writing a blog post or tweet

## Troubleshooting

### Common Issues

1. **"Extension icon is missing"**
   - Ensure `extension-icon.png` exists
   - Must be 512x512px PNG

2. **"Screenshots are invalid"**
   - Must be exactly 2000x1250px
   - PNG format only
   - Place in `metadata/` folder

3. **Linting warnings about "SomaFM"**
   - These are expected - SomaFM is correct branding
   - Warnings don't block publishing

### Getting Help

- [Raycast Developer Documentation](https://developers.raycast.com)
- [Raycast Slack Community](https://raycast.com/community)
- [GitHub Issues](https://github.com/raycast/extensions/issues)