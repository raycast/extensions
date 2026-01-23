# Raycast Store Submission Checklist

## ✅ Completed

- [x] ESLint configuration added
- [x] Package.json properly configured
  - [x] Icon changed from emoji to `icon.png`
  - [x] Platform set to `macOS` (correct casing)
  - [x] Author set to Raycast username
  - [x] License set to MIT
- [x] All code passes linting (`bun run lint`)
- [x] Extension builds successfully (`bun run build`)
- [x] TypeScript types properly defined (no `any` types)
- [x] 512x512px icon.png in assets folder
- [x] CHANGELOG.md created
- [x] README.md with setup instructions
- [x] All changes committed to git

## 📸 Required: Add Screenshots

**Before submitting**, you need to add screenshots to the `metadata` folder.

### Screenshot Requirements

- **Count**: Minimum 3, maximum 6 screenshots recommended
- **Size**: 2000 x 1250 pixels (landscape)
- **Aspect ratio**: 16:10
- **Format**: PNG
- **Content**: Show your extension in action with realistic data

### How to Capture Screenshots

Raycast has a built-in screenshot tool:

1. Go to Raycast Preferences → Advanced → Window Capture
2. Set a hotkey (e.g., Cmd+Shift+Option+M)
3. Run your extension in dev mode (`bun run dev`)
4. Open a command you want to screenshot
5. Press your screenshot hotkey
6. Check "Save to Metadata" option
7. Screenshots will be automatically saved to the `metadata` folder

### Screenshot Tips

- ✅ Use a background with good contrast (try [Raycast Wallpapers](https://www.raycast.com/wallpapers))
- ✅ Show the most informative commands
- ✅ Include the display selection dropdown
- ✅ Show the current brightness display
- ✅ Capture the HUD notification if possible
- ❌ Don't use multiple different backgrounds
- ❌ Don't include sensitive data
- ❌ Don't mix light/dark themes unless demonstrating a feature

## 🚀 Submit to Store

Once you've added screenshots, run:

```bash
cd "/Users/pavelzagorodnikh/Library/CloudStorage/GoogleDrive-pavzagor@gmail.com/My Drive/Dev experiments/Raycast extensions/Brightness control"
npm run publish
```

This will:
1. Validate your extension
2. Ask you to authenticate with GitHub
3. Automatically create a Pull Request to raycast/extensions

## 📋 Extension Features to Highlight

When asked about your extension during review, mention:

- **Smart cursor detection** - Automatically adjusts the display where your cursor is
- **Multi-monitor support** - Works with all Mac displays including XDR
- **User-friendly setup** - Auto-installation guidance for Lunar
- **Visual feedback** - Shows old → new brightness with display name
- **Reliable operation** - Built-in retry logic and verification

## 🎯 What Happens Next

1. **Review** - Raycast team reviews (usually a few days)
2. **Feedback** - They may request changes
3. **Merge** - Once approved, they'll merge your PR
4. **Published** - Extension appears in the Raycast Store automatically!

## 📝 Notes

- No remote git repository is configured. If you want to push to a remote, set up GitHub first:
  ```bash
  gh repo create brightness-control --public --source=. --remote=origin
  git push -u origin master
  ```

Good luck with your submission! 🎉
