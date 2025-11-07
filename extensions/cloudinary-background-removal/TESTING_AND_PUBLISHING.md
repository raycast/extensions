# Testing & Publishing Guide

Complete guide for testing your extension locally and publishing it to the Raycast Store.

---

## 🧪 Testing Locally (Development Mode)

**Yes! You can absolutely use it locally as an extension.** This is the recommended way to test before publishing.

### Step 1: Install Dependencies

```bash
cd extension
npm install
```

This installs all required packages (Raycast API, TypeScript, React, etc.).

### Step 2: Start Development Mode

```bash
npm run dev
```

**What happens:**
- Raycast CLI starts watching your code for changes
- Your extension is loaded into Raycast **locally**
- You can use it immediately in Raycast
- Changes to code automatically reload (hot reload)

### Step 3: Use the Extension in Raycast

1. **Open Raycast** (`Cmd + Space`)
2. **Type**: `Remove Background`
3. **Press Enter** - Your extension opens!
4. **Configure Preferences** (first time only):
   - Press `Cmd + ,` to open Raycast Preferences
   - Go to **Extensions** → **Cloudinary Background Removal**
   - Enter your **Cloudinary Cloud Name** (required)
   - Set **Upload Preset** (default: `background_removal_preset`)
   - Set **Output Directory** (default: `~/Downloads`)

### Step 4: Test Everything

**Basic Functionality:**
- [ ] Select an image in Finder
- [ ] Click "Select File from Finder" (⌘F)
- [ ] Click "Remove Background" (⌘Enter)
- [ ] Verify image is processed and saved
- [ ] Check that Preview opens automatically

**Error Scenarios:**
- [ ] Test with invalid cloud name
- [ ] Test with no file selected
- [ ] Test with non-image file
- [ ] Test with very large file (>100MB)
- [ ] Test with network disconnected

**Edge Cases:**
- [ ] Test with file path containing special characters
- [ ] Test with output directory that doesn't exist
- [ ] Test with file already exists (should create unique name)

### Development Tips

- **Hot Reload**: Changes to your code automatically reload in Raycast
- **Console Logs**: Check Raycast's developer console for errors
- **Preferences**: Changes to preferences require restarting the extension
- **Stop Dev Mode**: Press `Ctrl + C` in terminal to stop

---

## 📦 Building for Production

Once testing is complete, build the extension:

```bash
npm run build
```

**What this does:**
- Compiles TypeScript to JavaScript
- Bundles all code
- Creates `dist/` folder with production-ready code
- Validates the extension structure

**Check the build:**
- Verify `dist/` folder was created
- Check for any build errors
- Test the built version if needed

---

## 🚀 Publishing to Raycast Store

### Prerequisites

1. **Raycast Developer Account**
   - Sign up at [raycast.com](https://raycast.com)
   - Join the developer program
   - Verify your account

2. **Extension Requirements** ✅
   - [x] Code complete and tested
   - [x] Icon created (`extension/icon.png`, 512x512px)
   - [x] Author set: "Milk Moon Studio"
   - [x] Website added: https://www.milkmoonstudio.com
   - [x] README updated
   - [x] Preferences configured
   - [x] Error handling in place

### Step 1: Final Checks

Before publishing, verify:

```bash
# Check for linting errors
npm run lint

# Fix any auto-fixable issues
npm run fix-lint

# Build to ensure everything compiles
npm run build
```

### Step 2: Publish

```bash
npm run publish
```

**What happens:**
1. Raycast CLI opens the publishing interface
2. You'll be asked to log in (if not already)
3. Extension is uploaded to Raycast
4. You fill out the submission form

### Step 3: Submission Form

Fill out these details:

**Required:**
- **Extension Name**: "Cloudinary Background Removal"
- **Description**: Already in `package.json`, but you can enhance it
- **Category**: Media / Design (already set)
- **Tags**: e.g., "cloudinary", "background", "image", "removal", "design"

**Optional but Recommended:**
- **Screenshots**: Take screenshots of the extension in action
- **Video Demo**: Link to a demo video (optional)
- **Release Notes**: What's new in this version

### Step 4: Review Process

**Timeline:**
- Raycast team reviews your extension
- Usually takes **2-5 business days**
- You'll receive email notifications

**What they check:**
- Code quality and security
- Functionality
- Documentation
- Store guidelines compliance
- User experience

**Possible Outcomes:**
- ✅ **Approved**: Extension goes live in the store
- ⚠️ **Needs Changes**: You'll get feedback and can resubmit
- ❌ **Rejected**: Rare, usually with explanation

### Step 5: After Approval

**Your extension is live!**
- Users can install from Raycast Store
- You can monitor usage and feedback
- Users can rate and review

---

## 🔄 Updating Your Extension

When you want to update:

1. **Make Changes**
   - Update code
   - Test locally with `npm run dev`
   - Update version in `package.json` (e.g., `1.0.0` → `1.0.1`)

2. **Build**
   ```bash
   npm run build
   ```

3. **Publish Update**
   ```bash
   npm run publish
   ```
   - Select "Update existing extension"
   - Add release notes for what changed

---

## 📋 Pre-Publishing Checklist

Before you publish, make sure:

### Code
- [x] All code tested locally
- [x] No linting errors
- [x] Build succeeds without errors
- [x] Error handling comprehensive
- [x] No hardcoded credentials

### Configuration
- [x] Author: "Milk Moon Studio"
- [x] Author URL: https://www.milkmoonstudio.com
- [x] Version: 1.0.0
- [x] Icon: `extension/icon.png` (512x512px)
- [x] Description: Clear and accurate

### Documentation
- [x] README.md complete
- [x] Installation instructions clear
- [x] Usage examples provided
- [x] Troubleshooting section included

### Testing
- [x] Tested with real Cloudinary account
- [x] Tested all error scenarios
- [x] Tested with different image types
- [x] Tested preferences configuration
- [x] Tested file selection from Finder

---

## 🐛 Troubleshooting Development

### Extension Not Appearing in Raycast

**Solution:**
- Make sure `npm run dev` is running
- Check terminal for errors
- Restart Raycast
- Verify you're in the `extension/` directory

### Changes Not Reflecting

**Solution:**
- Wait a moment for hot reload
- Manually reload: `Cmd + R` in Raycast
- Check terminal for compilation errors
- Restart `npm run dev`

### Build Errors

**Solution:**
```bash
# Check for TypeScript errors
npm run lint

# Fix auto-fixable issues
npm run fix-lint

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Preferences Not Saving

**Solution:**
- Make sure preferences are defined in `package.json`
- Restart Raycast after changing preferences
- Check Raycast Preferences UI

---

## 📚 Resources

- [Raycast Developer Docs](https://developers.raycast.com/)
- [Publishing Guide](https://developers.raycast.com/information/publish-an-extension)
- [Store Guidelines](https://developers.raycast.com/information/prepare-an-extension-for-store)
- [Extension Examples](https://github.com/raycast/extensions)

---

## 🎯 Quick Reference

### Development
```bash
cd extension
npm install          # First time only
npm run dev          # Start development mode
# Use extension in Raycast
# Make changes, they auto-reload
```

### Building
```bash
npm run build        # Create production build
```

### Publishing
```bash
npm run publish     # Publish to store
```

### Testing Commands
```bash
npm run lint        # Check for errors
npm run fix-lint    # Auto-fix issues
```

---

**Ready to test?** Start with `npm install` and `npm run dev`!

**Ready to publish?** Complete the checklist above and run `npm run publish`!


