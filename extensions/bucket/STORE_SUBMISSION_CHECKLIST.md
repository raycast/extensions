# Raycast Store Submission Checklist

Use this checklist before submitting your extension to the Raycast Store.

## Metadata & Configuration

- [x] `package.json` uses correct Raycast username in `author` field (update "miracleio" to your username)
- [x] `package.json` uses `MIT` in `license` field
- [x] Using latest Raycast API version (`^1.70.0`)
- [x] `package-lock.json` is included (using npm, not yarn)
- [x] Extension title follows Title Case: "Bucket Bookmarks" ✅
- [x] Extension description is clear and concise
- [x] Categories are set: "Productivity", "Web"
- [x] Keywords added for better discoverability

## Extension & Command Naming

- [x] Extension title: "Bucket Bookmarks" (follows Apple Style Guide)
- [x] Command titles follow Title Case convention:
  - [x] "Search Bookmarks" ✅
  - [x] "Save Bookmark" ✅
  - [x] "Connect Device" ✅
  - [x] "Manage Authentication" ✅
- [x] Command subtitles add context: "Bucket"
- [x] Command descriptions are clear and descriptive
- [x] No articles in command titles (no "a", "an", "the")

## Extension Icon

- [ ] **TODO**: Create 512x512px icon in PNG format
- [ ] Icon looks good in both light and dark themes
- [ ] Icon is not the default Raycast icon
- [ ] Icon file is named `icon.png` in root directory
- [ ] Unused icons removed from assets

**Icon Resources:**

- Use [Raycast Icon Generator](https://icon.ray.so/)
- Use [Icon Template](https://www.figma.com/community/file/1030764827259035122/Extensions-Icon-Template)
- Ask for help in [#extensions channel](https://raycast.com/community)

## README Documentation

- [x] README.md exists in extension root
- [x] README includes setup instructions for both auth methods
- [x] README includes troubleshooting section
- [x] README includes keyboard shortcuts
- [x] README includes support contact information
- [x] All links in README are working
- [x] No sensitive data in README

## Screenshots

- [ ] **TODO**: Add 3-6 screenshots using Window Capture tool
- [ ] Screenshots are 2000x1250px (16:10 aspect ratio)
- [ ] Screenshots are in PNG format
- [ ] Screenshots saved to `metadata/` folder
- [ ] Same background used across all screenshots
- [ ] Background has good contrast
- [ ] No sensitive data visible in screenshots
- [ ] Screenshots show most informative commands
- [ ] No other applications visible in screenshots

**How to capture:**

1. Set up Window Capture hotkey in Raycast Advanced Preferences (e.g., `⌘⇧⌥+M`)
2. Run extension in development mode (`npm run dev`)
3. Open the command you want to capture
4. Press your hotkey and tick "Save to Metadata"
5. Choose a nice background from [Raycast Wallpapers](https://www.raycast.com/wallpapers)

## Version History

- [x] CHANGELOG.md exists in extension root
- [x] CHANGELOG follows correct format with `{PR_MERGE_DATE}`
- [x] Changes are clearly described
- [x] Title is in square brackets: `[Initial Release]`
- [x] Date format: `- {PR_MERGE_DATE}`

## Code Quality

- [ ] Run `npm install` successfully
- [ ] Run `npm run build` successfully (no errors)
- [ ] Run `npm run lint` successfully (no errors)
- [ ] Test extension with distribution build
- [ ] All commands work as expected
- [ ] Error handling is comprehensive
- [ ] No console.log statements in production code
- [ ] TypeScript types are properly defined

## UI/UX Guidelines

- [x] Preferences use the Preferences API (not separate commands)
- [x] Required preferences marked with `required: true`
- [x] Action panel actions follow Title Case
- [x] Actions with submenus have ellipses (…)
- [x] Navigation API used for pushing screens
- [x] Empty states use List.EmptyView / Grid.EmptyView
- [x] No flickering empty states on load
- [x] Navigation titles only used in nested screens
- [x] Placeholders in all text fields
- [x] Search bar has placeholder

## Security & Privacy

- [x] No external analytics included
- [x] No keychain access requested
- [x] Tokens stored in LocalStorage (encrypted by Raycast)
- [x] No opaque binaries bundled
- [x] No heavy binary dependencies
- [ ] If downloading binaries: from trusted sources with hash verification

## Testing

### Authentication

- [ ] Device connection flow works end-to-end
- [ ] Pairing code displays correctly (XXX-XXX format)
- [ ] Web app link opens correctly
- [ ] Status polling works (5-second intervals)
- [ ] Approval completes successfully
- [ ] Rejection handled properly
- [ ] Expiration handled properly (15 minutes)
- [ ] Token stored in LocalStorage
- [ ] API token authentication works
- [ ] Invalid token handled gracefully
- [ ] Switch between auth methods works

### Commands

- [ ] Search Bookmarks displays results
- [ ] Search filtering works correctly
- [ ] Open bookmark in browser works
- [ ] Copy URL works
- [ ] Copy title works
- [ ] Edit bookmark works
- [ ] Delete bookmark works (with confirmation)
- [ ] Toggle featured works
- [ ] AI organization triggers
- [ ] Save bookmark from clipboard works
- [ ] Folder assignment works
- [ ] Tag support works
- [ ] Menu bar displays bookmarks
- [ ] Menu bar refresh works

### Error Handling

- [ ] No internet connection handled
- [ ] Invalid token handled
- [ ] Expired code handled
- [ ] API errors displayed properly
- [ ] Network timeouts handled
- [ ] Empty states displayed

## Pre-Submission Steps

1. **Update Author**

   ```json
   "author": "your-raycast-username"
   ```

2. **Create Icon**
   - Use [icon.ray.so](https://icon.ray.so/)
   - Save as `icon.png` (512x512px)
   - Test in light and dark themes

3. **Capture Screenshots**
   - Use Window Capture tool
   - Save 3-6 screenshots to `metadata/`
   - Use consistent background

4. **Final Build & Test**

   ```bash
   npm install
   npm run build
   npm run lint
   ```

5. **Test Distribution Build**
   - Open extension in Raycast
   - Test all commands
   - Verify everything works

6. **Review Checklist**
   - Go through this entire checklist
   - Fix any remaining issues

7. **Submit**
   ```bash
   npm run publish
   ```

## Post-Submission

- [ ] Extension submitted successfully
- [ ] Received confirmation email
- [ ] Waiting for review (1-3 business days)
- [ ] Respond to any review feedback promptly

## Common Rejection Reasons

❌ **Avoid these:**

- Using default Raycast icon
- Missing or poor quality screenshots
- Incomplete README
- Linting errors
- Build errors
- Poor command naming (not Title Case)
- Missing required preferences
- External analytics
- Keychain access
- Opaque binaries

## Resources

- [Raycast Developer Docs](https://developers.raycast.com/)
- [Extension Guidelines](https://manual.raycast.com/extensions)
- [Store Preparation Guide](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Icon Generator](https://icon.ray.so/)
- [Community Slack](https://raycast.com/community)

## Need Help?

- Ask in [#extensions channel](https://raycast.com/community) on Slack
- Email: feedback@raycast.com
- Check [existing extensions](https://www.raycast.com/store) for inspiration

---

**Good luck with your submission! 🚀**
