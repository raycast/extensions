# Raycast Extension Submission Checklist

Use this checklist to prepare your Playtime extension for submission to the Raycast Store.

## Pre-Submission Checklist

### 1. Code Quality & Build
- [ ] Run `npm run build` - ensure it builds without errors
- [ ] Run `npm run lint` - fix any linting errors
- [ ] Run `npm run fix-lint` - auto-fix any fixable linting issues
- [ ] Test the extension in development mode (`npm run dev`)
- [ ] Verify all TypeScript types are correct (no type errors)
- [ ] Ensure no console errors or warnings in production build

### 2. Package.json Configuration
- [ ] **Author**: Set to your Raycast account username (`"justinlancaster"` - ✅ already set)
- [ ] **License**: Must be `"MIT"` (✅ already set)
- [ ] **Version**: Start at `"1.0.0"` (✅ already set)
- [ ] **Platforms**: Correctly specified (`["macOS", "windows"]` - ✅ already set)
- [ ] **Categories**: Appropriate category selected (`["Games"]` - ✅ already set)
- [ ] **Keywords**: Relevant keywords included (✅ already set)
- [ ] **Dependencies**: Using latest compatible versions
- [ ] **package-lock.json**: Must be included in repository

### 3. Extension Metadata
- [ ] **Title**: Clear and descriptive (`"Playtime"` - ✅ already set)
- [ ] **Description**: Accurate and compelling (✅ already set)
- [ ] **Icon**: Custom icon present (`assets/icon.png` - ✅ already set)
  - [ ] Icon is 512x512 pixels
  - [ ] Icon is visually clear and recognizable
- [ ] **Command name**: Descriptive (`"check-playtime"` - ✅ already set)
- [ ] **Command title**: User-friendly (`"Playtime"` - ✅ already set)

### 4. Documentation
- [ ] **README.md**: Complete and accurate
  - [ ] Clear setup instructions
  - [ ] Usage guidelines
  - [ ] API key/credential requirements explained
  - [ ] Troubleshooting section
  - [ ] Privacy information
- [ ] **CHANGELOG.md**: Create if not exists
  - [ ] Document version 1.0.0 changes
  - [ ] Use `{PR_MERGE_DATE}` placeholder for dates

### 5. Functionality Testing
- [ ] **Zero-setup path**: Test automatic Steam detection (macOS)
- [ ] **Zero-setup path**: Test automatic Steam detection (Windows)
- [ ] **API fallback**: Test with Steam ID only (public profile)
- [ ] **API fallback**: Test with Steam ID + API key (private profile)
- [ ] **Search functionality**: Verify game search works
- [ ] **Sorting**: Test all sort options (Total Hours, Name, File Size, Installed)
- [ ] **Actions**: Test Launch Game, Copy Playtime, Uninstall, View on Steam
- [ ] **Preferences**: Test time display format (hours/days)
- [ ] **Error handling**: Test error states (no games, no Steam, private profile)
- [ ] **Loading states**: Verify loading indicators work correctly
- [ ] **Edge cases**: Test with empty library, no installed games, etc.

### 6. User Experience
- [ ] All actions work as expected
- [ ] Error messages are clear and helpful
- [ ] Loading states are appropriate
- [ ] UI is responsive and intuitive
- [ ] Icons and images load correctly
- [ ] Keyboard shortcuts work (Cmd+L, Cmd+C, Cmd+R, Cmd+,)
- [ ] Search is responsive and accurate

### 7. Privacy & Security
- [ ] No sensitive data is logged or exposed
- [ ] API keys are stored securely (using password preference type)
- [ ] Privacy information documented in README
- [ ] No unnecessary data collection
- [ ] All API calls are to official Steam endpoints

### 8. Platform Compatibility
- [ ] **macOS**: Fully tested and working
- [ ] **Windows**: Fully tested and working
- [ ] Platform-specific code handles both platforms correctly
- [ ] File paths work on both platforms

### 9. Code Organization
- [ ] Code is well-structured and readable
- [ ] No commented-out code or debug statements
- [ ] Error handling is comprehensive
- [ ] Functions are appropriately named
- [ ] Comments explain complex logic

### 10. Store Compliance
- [ ] Extension provides unique value
- [ ] Doesn't duplicate Raycast native features
- [ ] Content is appropriate (non-violent, respectful)
- [ ] Follows Raycast design guidelines
- [ ] No external dependencies that violate policies

## Submission Steps

### Step 1: Final Verification
```bash
# Navigate to extension directory
cd /Users/justinlancaster/raycast-dev/playtime

# Build the extension
npm run build

# Run linting
npm run lint

# Fix any issues
npm run fix-lint
```

### Step 2: Create CHANGELOG.md (if needed)
Create a `CHANGELOG.md` file with:
```markdown
# Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Added
- Initial release of Playtime extension
- Automatic Steam installation detection (macOS & Windows)
- Local file reading for zero-setup experience
- Steam API fallback support
- Game library search and filtering
- Multiple sort options (Total Hours, Name, File Size, Installed)
- Launch and uninstall game actions
- Time display format preferences (hours/days)
- Game box art display
- File size calculation for installed games
```

### Step 3: Publish
```bash
# Add publish script if not present (check package.json)
# Then run:
npm run publish
```

If the `publish` script doesn't exist, add this to `package.json`:
```json
"scripts": {
  "publish": "npx @raycast/api@latest publish"
}
```

### Step 4: Pull Request Review
- [ ] Monitor the PR in `raycast/extensions` repository
- [ ] Respond promptly to any feedback
- [ ] Make requested changes
- [ ] Wait for approval

### Step 5: Post-Publication
- [ ] Share with Raycast community
- [ ] Announce on social media
- [ ] Update documentation if needed based on user feedback

## Quick Test Commands

```bash
# Build
npm run build

# Lint
npm run lint

# Fix linting
npm run fix-lint

# Development mode
npm run dev

# Publish (when ready)
npm run publish
```

## Notes

- The extension name in `package.json` should match your Raycast username
- Ensure `package-lock.json` is committed to the repository
- All dependencies should be in `dependencies` or `devDependencies` (not global)
- Test on both macOS and Windows if possible
- Make sure the icon is high quality and recognizable

## Common Issues to Check

- [ ] No hardcoded API keys or secrets
- [ ] No platform-specific code that breaks on other platforms
- [ ] Error messages are user-friendly
- [ ] README accurately describes setup and usage
- [ ] All preferences are optional or have sensible defaults
- [ ] Extension handles network errors gracefully
- [ ] No infinite loops or performance issues

---

**Good luck with your submission! 🚀**

