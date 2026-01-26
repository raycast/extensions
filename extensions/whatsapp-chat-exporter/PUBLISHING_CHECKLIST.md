# Publishing Checklist for Raycast Store

## Before Publishing

### 1. Update Author Information
Edit `package.json` and replace `YOUR_GITHUB_USERNAME` with your actual GitHub username in these fields:
- `"author": "YOUR_GITHUB_USERNAME"`
- `"contributors": ["YOUR_GITHUB_USERNAME"]`

Also update the README.md GitHub link at the bottom.

### 2. Create Extension Icon
Create or download a 512x512 PNG icon:
- **File name**: `icon.png`
- **Size**: 512x512 pixels
- **Format**: PNG
- **Location**: Root directory of the project

**Icon Sources:**
- Flaticon: https://www.flaticon.com/search?word=whatsapp%20export
- Icons8: https://icons8.com/icons/set/whatsapp
- Create your own using Figma, Sketch, or SF Symbols

**Quick Option - Use SF Symbols (macOS):**
1. Open SF Symbols app (comes with Xcode)
2. Search for "message.badge.filled.fill" or "bubble.left.and.bubble.right"
3. Export as PNG at 512x512

### 3. Create GitHub Repository
You need to create a public GitHub repository for the extension:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial release: WhatsApp Chat Exporter v1.0.0"

# Create GitHub repo and push
# Go to https://github.com/new
# Create repo named: whatsapp-raycast-exporter
# Then run:
git remote add origin https://github.com/IamMohitm/whatsapp-raycast-exporter.git
git branch -M main
git push -u origin main
```

### 4. Test the Extension Locally
Before publishing, make sure everything works:

```bash
# Build the extension
npm run build

# Test in development mode
npm run dev
```

Test these scenarios:
- [ ] Export a personal chat
- [ ] Export a group chat
- [ ] Export with media files
- [ ] Export to both JSON and Markdown
- [ ] Export all chats
- [ ] Verify sender names appear correctly

### 5. Clean Up Project
Remove any debug files or unnecessary code:

```bash
# Remove debug files if any exist
rm -f debug*.js explore*.js

# Run linter
npm run lint

# Fix any linting issues
npm run fix-lint
```

## Publishing to Raycast Store

### Step 1: Create Raycast Account
1. Go to https://raycast.com
2. Sign in with GitHub
3. Link your GitHub account

### Step 2: Publish Extension

```bash
npm run publish
```

This will:
1. Build the extension
2. Validate all metadata
3. Check for required files (README, icon, etc.)
4. Submit to Raycast Store for review

### Step 3: Fill Out Store Listing
The publish command will guide you through:
- Extension description (already in package.json)
- Screenshots (optional but recommended)
- Categories
- Keywords

### Step 4: Wait for Review
- Raycast team will review your extension
- This typically takes 1-3 business days
- You'll receive email notifications about the review status

## After Publishing

### Monitor Feedback
- Check the Raycast Slack community
- Respond to GitHub issues
- Monitor extension reviews

### Future Updates
To publish updates:
1. Update version in `package.json` (follow semver)
2. Update `CHANGELOG.md`
3. Commit changes
4. Run `npm run publish` again

## Checklist Summary

- [ ] Updated `package.json` with GitHub username
- [ ] Created `icon.png` (512x512)
- [ ] Created GitHub repository
- [ ] Pushed code to GitHub
- [ ] Tested extension locally
- [ ] Cleaned up debug files
- [ ] Ran linter
- [ ] Ready to run `npm run publish`

## Need Help?
- Raycast Extensions Documentation: https://developers.raycast.com
- Raycast Slack Community: https://raycast.com/community
- GitHub Issues: https://github.com/IamMohitm/whatsapp-raycast-exporter/issues
