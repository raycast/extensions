# Publishing Checklist for WLED Controller

This document outlines the steps to prepare and publish the WLED Controller extension to the Raycast Store.

## Pre-Publishing Checklist

### ✅ Completed Items

1. **Package.json Metadata**
   - Updated extension title and description
   - Set license to MIT
   - Added proper command metadata with titles and descriptions
   - Icon set to `command-icon.png`

2. **Icons**
   - ✅ `command-icon.png` created in assets folder
   - ✅ Icons are proper PNG format
   - ✅ Light and dark mode icons available

3. **Documentation**
   - ✅ README.md updated for Raycast Store (concise, clear features)
   - ✅ CHANGELOG.md follows Raycast format
   - ✅ LICENSE file present (MIT)

4. **Code Quality**
   - ✅ ESLint configuration added (`.eslintrc.js`)
   - ✅ TypeScript type safety improved
   - ✅ React imports fixed
   - ✅ LocalStorage API used correctly
   - ✅ Error handling implemented
   - ✅ Toast notifications for user feedback

5. **Features**
   - ✅ Multi-device management
   - ✅ Device persistence with LocalStorage
   - ✅ Color picker with RGB/hex sync
   - ✅ Custom color storage
   - ✅ Effects browser
   - ✅ Brightness presets with keyboard shortcuts
   - ✅ Connection testing

### ⚠️ Items Requiring Your Attention

1. **Author/Owner Update**
   - **Current**: `author: "creative-koda-lab"`
   - **Action Required**: Verify this matches your Raycast username
   - **How to check**: Visit https://www.raycast.com/ and create/login to your account
   - **Update in**: `package.json` line 7

2. **Build Process**
   - The extension currently has TypeScript/React version conflicts
   - **Action Required**: Run `npm run dev` to test locally first
   - If issues persist, consider updating `@raycast/api` to latest version

3. **Screenshots** (Optional but Recommended)
   - Create 2-4 screenshots showing:
     1. Device list view
     2. Device control panel
     3. Color picker
     4. Effects browser
   - Recommended size: 1280x800 or 1600x1000
   - Format: PNG
   - These will be uploaded during the PR process

## Publishing Steps

### 1. Test Locally

```bash
# Run in development mode
npm run dev

# Test all features:
- Add a device
- Control power
- Change colors
- Apply effects
- Test keyboard shortcuts
```

### 2. Run Quality Checks

```bash
# Run linter
npm run lint

# Fix lint issues automatically
npm run fix-lint

# Build for production
npm run build
```

### 3. Publish to Raycast Store

```bash
# This will create a pull request to the Raycast extensions repository
npm run publish
```

**What happens:**
- Opens GitHub authentication
- Forks the `raycast/extensions` repository (if needed)
- Creates a new branch with your extension
- Opens a pull request
- Copies PR URL to clipboard

### 4. Pull Request Process

After running `npm run publish`:

1. **GitHub Login**: Authenticate with GitHub when prompted
2. **Fork Created**: Your fork of raycast/extensions will be created
3. **Branch Pushed**: Extension code pushed to your fork
4. **PR Opened**: Pull request created automatically
5. **Review Process**: Raycast team will review your extension

**Review Timeline**: Usually 2-7 days

## Post-Publishing

### Updating Your Extension

When you need to make updates:

1. Make your changes locally
2. Update version in `package.json`
3. Add entry to `CHANGELOG.md` with new changes
4. Run `npm run publish` again
5. New PR will be created

### Pull Contributions

If others contribute to your extension:

```bash
npx @raycast/api@latest pull-contributions
```

## Common Issues & Solutions

### Issue: Author validation fails
**Solution**: Update `author` field in `package.json` to match your Raycast username exactly

### Issue: Build fails with TypeScript errors
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Icons not found
**Solution**: Ensure `assets/command-icon.png` exists and is a valid PNG file

### Issue: Lint errors
**Solution**:
```bash
npm run fix-lint
```

## Resources

- [Raycast Extensions Repository](https://github.com/raycast/extensions)
- [Publishing Guidelines](https://developers.raycast.com/basics/publish-an-extension)
- [Extension Best Practices](https://developers.raycast.com/information/best-practices)
- [API Documentation](https://developers.raycast.com/api-reference)

## Support

- GitHub Issues: https://github.com/raycast/extensions/issues
- Raycast Discord: https://raycast.com/community
- Slack Community: https://raycast.com/community

---

**Good luck with your submission!** 🚀
