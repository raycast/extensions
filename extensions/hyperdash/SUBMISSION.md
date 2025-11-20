# Raycast Store Submission Guide

This document outlines the steps to submit hyperDASH to the Raycast Store.

## Prerequisites

✅ **Completed**:
- [x] Updated `package.json` with store-ready metadata
- [x] Created retro minimalist icon (`icon.png`)
- [x] Added MIT LICENSE
- [x] Created CHANGELOG.md
- [x] Enhanced README for public audience
- [x] Build script with auto-versioning
- [x] Extension builds successfully

📸 **TODO - Take Screenshots**:
- [ ] Capture 2-5 screenshots showing the extension in action
- [ ] Save them in the `metadata/` folder
- [ ] See `metadata/README.md` for guidelines

## Submission Process

### 1. Create GitHub Repository (if not already public)

```bash
# If not already pushed to GitHub
git remote add origin https://github.com/svndco/hyperdash-raycast.git
git branch -M main
git push -u origin main
```

### 2. Fork Raycast Extensions Repository

1. Go to: https://github.com/raycast/extensions
2. Click "Fork" to create your fork
3. Clone your fork locally

### 3. Add Your Extension

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/extensions.git raycast-extensions
cd raycast-extensions

# Create extension folder
mkdir -p extensions/hyperdash
cp -r /path/to/hyperdash-raycast/* extensions/hyperdash/

# Install dependencies and test
cd extensions/hyperdash
npm install
npm run build
npm run lint
```

### 4. Prepare Screenshots

Before submitting, you MUST add screenshots:

1. Open Raycast
2. Load the extension
3. Take screenshots showing:
   - Task list with different statuses
   - Project view
   - Search/filtering in action
   - Task with metadata (priority, recurrence, time tracking)
4. Save to `metadata/` folder
5. Update `package.json` if needed to reference screenshots

### 5. Submit Pull Request

```bash
# Create a branch
git checkout -b add-hyperdash-extension

# Commit your extension
git add extensions/hyperdash
git commit -m "Add hyperDASH extension

hyperDASH is a powerful task and project management extension for Obsidian users.

Features:
- TaskNotes 4.0.1 compatibility
- Tag-based filtering via Obsidian Bases
- Smart sorting (priority, due date, modified time)
- Recurrence patterns
- Time tracking
- Performance optimized for large vaults
"

# Push to your fork
git push origin add-hyperdash-extension
```

6. Go to https://github.com/raycast/extensions
7. Click "Compare & pull request"
8. Fill out the PR template
9. Wait for Raycast team review

## Raycast Store Requirements Checklist

### Required Files
- [x] `package.json` - Store metadata
- [x] `README.md` - User documentation
- [x] `LICENSE` - MIT license
- [x] `CHANGELOG.md` - Version history
- [x] `icon.png` - Extension icon (512x512 recommended)
- [ ] `metadata/*.png` - Screenshots (2-5 recommended)

### Package.json Requirements
- [x] `name` - Lowercase, no spaces
- [x] `title` - Display name
- [x] `description` - Clear, concise description
- [x] `author` - Your GitHub username or organization
- [x] `license` - "MIT" recommended
- [x] `keywords` - Searchable keywords
- [x] `categories` - Appropriate category
- [x] `icon` - Path to icon file
- [x] `commands` - At least one command

### Code Quality
- [x] Builds without errors
- [x] No TypeScript errors
- [x] Follows Raycast best practices
- [x] Uses proper error handling
- [x] Responsive UI

### Documentation
- [x] Clear setup instructions
- [x] Feature descriptions
- [x] Configuration guide
- [x] Examples

## After Submission

1. **Monitor PR**: Watch for feedback from Raycast team
2. **Respond promptly**: Address any requested changes
3. **Test thoroughly**: Ensure the extension works in various scenarios
4. **Update as needed**: Be prepared to make adjustments

## Support & Maintenance

After approval:
- Monitor GitHub issues
- Respond to user feedback
- Release updates as needed
- Keep dependencies up to date
- Maintain compatibility with Raycast API changes

## Resources

- [Raycast Extensions Documentation](https://developers.raycast.com/)
- [Extension Guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Raycast Extensions Repository](https://github.com/raycast/extensions)
- [Community Slack](https://raycast.com/community)

---

**Next Step**: Take screenshots and save them to `metadata/` folder, then you're ready to submit!
