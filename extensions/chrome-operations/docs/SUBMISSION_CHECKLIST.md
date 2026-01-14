# Raycast Extension Store Submission Checklist

## ✅ Completed Items

### package.json
- [x] License field set to "MIT"
- [x] Author field set to Raycast username
- [x] Latest Raycast API version (1.104.1)
- [x] Platforms set to macOS only (AppleScript dependency)
- [x] Proper categories (Applications)
- [x] Command names follow Title Case convention
- [x] Extension title is clear and descriptive ("Open in Chrome")
- [x] Extension description is a single sentence

### Dependencies
- [x] package-lock.json included
- [x] Dependencies installed via npm

### Documentation
- [x] CHANGELOG.md created with proper format
- [x] README.md with usage instructions
- [x] Screenshots guide created

### Code
- [x] TypeScript compilation passes
- [x] No Keychain access (security requirement)

### Assets
- [x] Icon is 512x512px PNG
- [x] Custom icon (not default Raycast icon)

## 📋 Pending Items

### Build & Test
- [ ] Run `npm run build` (requires Raycast CLI)
- [ ] Run `npm run lint` (requires Raycast CLI)
- [ ] Test both commands manually with `npm run dev`
- [ ] Test with Safari (primary browser)
- [ ] Test with Chrome
- [ ] Test with Edge
- [ ] Test with Firefox
- [ ] Test error handling (no browser active)
- [ ] Test error handling (Chrome not installed)

### Screenshots (CRITICAL - Store Rejection Without This)
- [ ] Create 3-6 screenshots (minimum 3 required)
- [ ] All screenshots 2000x1250 pixels
- [ ] Consistent background across all screenshots
- [ ] Good contrast and clarity
- [ ] No sensitive data visible
- [ ] Only showing extension in Raycast
- [ ] Save screenshots to `metadata/` directory
- [ ] Verify screenshots meet Raycast guidelines

### Final Review
- [ ] Test distribution build functionality
- [ ] Verify all command descriptions are accurate
- [ ] Check for any typos or grammatical errors
- [ ] Ensure US English spelling throughout
- [ ] Verify no external analytics included
- [ ] Confirm no localization attempts

## 📝 Notes

### Raycast CLI Installation
To run `npm run build` and `npm run lint`, you need the Raycast CLI:
```bash
npm install -g @raycast/api
```

### Screenshot Creation Process
Follow `metadata/SCREENSHOTS.md` for detailed instructions on creating screenshots using Raycast's Window Capture feature.

### Testing Checklist
1. Open Safari with a webpage
2. Run "Open URL in Chrome" command
3. Verify it opens in Chrome
4. Close Chrome (if needed)
5. Run "Open Chrome Incognito Mode" command
6. Verify it opens incognito window
7. Repeat with Chrome, Edge, and Firefox active
8. Test error scenarios (no browser active)

### Submission Process
After completing all pending items:
1. Run `npm run build` to create distribution build
2. Verify everything works with distribution build
3. Use `npm run publish` to submit to Raycast Store
4. Wait for review and approval

## ⚠️ Critical Requirements for Approval

1. **Screenshots are mandatory** - Extensions will be rejected without at least 3 screenshots
2. **TypeScript must compile** - Build must succeed without errors
3. **Lint must pass** - Code style must meet Raycast standards
4. **Manual testing** - All features must work correctly
5. **US English only** - No localization or British English
