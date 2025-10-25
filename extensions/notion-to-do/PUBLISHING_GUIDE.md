# Publishing Guide - Notion Task Manager

## ✅ Pre-Publishing Checklist

- [x] Extension built successfully
- [x] Version set to 1.0.0
- [x] CHANGELOG updated with all features
- [x] README documentation complete
- [x] Extension icon present
- [x] All linting passes
- [x] Package.json metadata complete

## 📦 Publishing Options

### Option 1: Private Store Listing (Recommended)

Publish to Raycast Store as **unlisted** - only people with the direct link can find it.

**Steps:**
1. Make sure you're logged into Raycast
2. Run: `npm run publish`
3. Follow the prompts:
   - Choose "Unlisted" for visibility
   - Add optional screenshots if desired
   - Submit for review

**Benefits:**
- Automatic updates for users
- Professional store listing
- Easy to share via link
- Still private (unlisted)

### Option 2: Direct Sharing

Share the extension file directly with specific people.

**Steps:**
1. Extension is already built in the repository
2. Share the entire project folder or create a distributable package
3. Recipients can install via: `npm install && npm run dev`

**Benefits:**
- Complete control
- No review process
- Instant sharing

### Option 3: Local Development Only

Keep it for personal use only.

**Steps:**
1. Already done! The extension is installed locally
2. Just run `npm run dev` to use it

## 🚀 Recommended: Publish as Unlisted

This gives you the best of both worlds - private but professionally distributed.

To proceed:
```bash
npm run publish
```

## 📸 Optional: Add Screenshots

While not required for unlisted extensions, screenshots make it more professional:

1. Take screenshots of key features (1280x800px or higher):
   - Create Task form
   - Daily Overview
   - AI Smart Task Creation
   - Search Results
   - Menu Bar Summary

2. Add them to a `metadata/` folder
3. Reference them during the publish process

## 🔐 Privacy Settings

When publishing, you can choose:
- **Unlisted**: Only people with link can access
- **Listed**: Anyone can find it in the store

For a private extension, choose **Unlisted**.

## 📝 After Publishing

Once published as unlisted:
1. You'll get a private URL
2. Share that URL with specific people
3. They can install with one click
4. You can push updates anytime

## 🆘 Need Help?

- Raycast Publishing Docs: https://developers.raycast.com/basics/publish-an-extension
- Raycast Community: https://raycast.com/community

