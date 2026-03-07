# Deployment Guide - Bucket Raycast Extension

Complete guide to deploying your extension to the Raycast Store.

## Prerequisites

- [x] Extension is fully functional
- [x] All features tested
- [x] Code is clean and linted
- [ ] Icon created (512x512px PNG)
- [ ] Screenshots captured (3-6 images)
- [ ] Raycast account created
- [ ] Author field updated in package.json

## Step-by-Step Deployment

### 1. Update Author Information

Open `package.json` and update the author field:

```json
{
  "author": "your-raycast-username"
}
```

Replace `"miracleio"` with your actual Raycast username.

### 2. Create Extension Icon

**Quick Method:**

1. Go to [icon.ray.so](https://icon.ray.so/)
2. Use bucket emoji 🪣 or bookmark icon 🔖
3. Choose gradient or solid background
4. Download as PNG (512x512px)
5. Save as `icon.png` in extension root

See [ICON_GUIDE.md](./ICON_GUIDE.md) for detailed instructions.

### 3. Capture Screenshots

**Using Raycast Window Capture:**

1. **Setup Hotkey**
   - Open Raycast Preferences → Advanced
   - Set Window Capture hotkey (e.g., `⌘⇧⌥+M`)

2. **Prepare Extension**

   ```bash
   npm run dev
   ```

3. **Choose Background**
   - Use [Raycast Wallpapers](https://www.raycast.com/wallpapers)
   - Pick one with good contrast
   - Use same background for all screenshots

4. **Capture Screenshots**
   - Open each command you want to showcase
   - Press your hotkey
   - Tick "Save to Metadata"
   - Capture 3-6 screenshots

**Recommended Screenshots:**

1. Search Bookmarks (with results)
2. Save Bookmark (with form filled)
3. Connect Device (showing pairing code)
4. Menu Bar (showing bookmarks)
5. Edit Bookmark (optional)
6. Manage Authentication (optional)

### 4. Final Code Review

```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Fix any linting issues
npm run fix-lint

# Build for production
npm run build
```

Fix any errors that appear.

### 5. Test Distribution Build

1. After `npm run build`, open Raycast
2. Search for your extension commands
3. Test each command thoroughly:
   - [ ] Search Bookmarks
   - [ ] Save Bookmark
   - [ ] Connect Device
   - [ ] Manage Authentication
   - [ ] Menu Bar
4. Test both authentication methods
5. Test error scenarios
6. Verify all keyboard shortcuts work

### 6. Review Checklist

Go through [STORE_SUBMISSION_CHECKLIST.md](./STORE_SUBMISSION_CHECKLIST.md) and ensure everything is checked.

**Critical Items:**

- [ ] Author field updated
- [ ] Icon created and looks good
- [ ] 3-6 screenshots captured
- [ ] README.md complete
- [ ] CHANGELOG.md formatted correctly
- [ ] No build or lint errors
- [ ] All commands tested

### 7. Submit to Store

```bash
npm run publish
```

This command will:

1. Validate your extension
2. Check all required fields
3. Build the extension
4. Upload to Raycast servers
5. Submit for review

**What to Expect:**

- Validation checks run automatically
- You'll see any errors immediately
- If successful, you'll get a confirmation
- Extension enters review queue

### 8. Review Process

**Timeline:**

- Usually 1-3 business days
- You'll receive email notifications
- Check your email regularly

**Possible Outcomes:**

**✅ Approved:**

- Extension goes live in the Store
- Users can install it immediately
- You'll receive a confirmation email

**📝 Changes Requested:**

- Reviewers will provide feedback
- Make the requested changes
- Resubmit with `npm run publish`

**❌ Rejected:**

- Review feedback explains why
- Fix the issues
- Resubmit when ready

### 9. Post-Approval

Once approved:

1. **Announce Your Extension**
   - Share in [#extensions channel](https://raycast.com/community)
   - Tweet about it (tag @raycastapp)
   - Share with your network

2. **Monitor Feedback**
   - Check for user issues
   - Respond to questions
   - Plan improvements

3. **Future Updates**
   - Update CHANGELOG.md with changes
   - Increment version in package.json
   - Run `npm run publish` to submit update

## Common Issues & Solutions

### Build Errors

**Issue:** TypeScript errors during build
**Solution:**

```bash
npm run build
# Fix any TypeScript errors shown
```

### Lint Errors

**Issue:** ESLint errors
**Solution:**

```bash
npm run lint
npm run fix-lint  # Auto-fix many issues
```

### Missing Icon

**Issue:** "Extension icon is required"
**Solution:** Create `icon.png` (512x512px) in extension root

### Missing Screenshots

**Issue:** "At least 3 screenshots required"
**Solution:** Use Window Capture tool to add screenshots to `metadata/`

### Author Field

**Issue:** "Invalid author field"
**Solution:** Update `author` in package.json to your Raycast username

### Validation Fails

**Issue:** Extension validation fails
**Solution:** Check error message and fix the specific issue

## Version Updates

To update your extension after it's published:

1. **Make Your Changes**

   ```bash
   npm run dev
   # Make and test your changes
   ```

2. **Update Version**

   In `package.json`:

   ```json
   {
     "version": "1.1.0"
   }
   ```

   Follow [Semantic Versioning](https://semver.org/):
   - Patch (1.0.1): Bug fixes
   - Minor (1.1.0): New features
   - Major (2.0.0): Breaking changes

3. **Update CHANGELOG**

   Add new section at top of `CHANGELOG.md`:

   ```markdown
   ## [New Feature Name] - {PR_MERGE_DATE}

   ### Added

   - New feature description

   ### Fixed

   - Bug fix description
   ```

4. **Test & Submit**
   ```bash
   npm run build
   npm run lint
   npm run publish
   ```

## Troubleshooting

### Can't Submit

1. Check you're logged into Raycast
2. Verify your Raycast account
3. Ensure you have internet connection
4. Try `npm run build` first

### Submission Hangs

1. Cancel with `Ctrl+C`
2. Check your internet connection
3. Try again: `npm run publish`

### Review Taking Long

- Reviews typically take 1-3 business days
- Be patient
- Check your email for updates
- Don't submit multiple times

## Getting Help

**Before Submission:**

- Review [STORE_SUBMISSION_CHECKLIST.md](./STORE_SUBMISSION_CHECKLIST.md)
- Check [Raycast Docs](https://developers.raycast.com/)
- Ask in [#extensions channel](https://raycast.com/community)

**During Review:**

- Wait for reviewer feedback
- Respond to review comments
- Make requested changes

**After Approval:**

- Monitor user feedback
- Fix bugs promptly
- Plan feature updates

## Resources

- **Raycast Docs**: [developers.raycast.com](https://developers.raycast.com/)
- **Store Guidelines**: [Extension Guidelines](https://manual.raycast.com/extensions)
- **Icon Generator**: [icon.ray.so](https://icon.ray.so/)
- **Community**: [raycast.com/community](https://raycast.com/community)
- **Email**: feedback@raycast.com

## Quick Reference

```bash
# Development
npm run dev              # Start development mode

# Testing
npm run build           # Build for production
npm run lint            # Check for errors
npm run fix-lint        # Auto-fix errors

# Deployment
npm run publish         # Submit to store
```

## Success Checklist

Before running `npm run publish`:

- [ ] Author field updated
- [ ] Icon created (512x512px PNG)
- [ ] 3-6 screenshots in metadata/
- [ ] README.md complete
- [ ] CHANGELOG.md formatted
- [ ] `npm run build` succeeds
- [ ] `npm run lint` succeeds
- [ ] All commands tested
- [ ] Both auth methods tested
- [ ] Error handling tested

---

**You're ready to deploy! Run `npm run publish` when all items are checked.** 🚀
