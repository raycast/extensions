# Raycast Store Submission Checklist

Follow this checklist to ensure your Coolicons extension is ready for submission to the Raycast Store.

## Before Submission

### Code Quality
- [x] Code passes linting: `npm run lint`
- [x] Extension builds successfully: `npm run build`
- [x] No TypeScript errors
- [x] All dependencies are properly installed
- [x] No console errors or warnings during development

### Documentation
- [x] README.md is comprehensive and well-formatted
- [x] CHANGELOG.md documents all features
- [x] Clear usage instructions included
- [x] Screenshots/media included
- [x] Features clearly listed

### Configuration
- [x] `package.json` has all required fields:
  - `name`: coolicons
  - `title`: Coolicons
  - `description`: Accurate and compelling
  - `icon`: icon.svg (16x16 or larger, preferably SVG)
  - `author`: bruadam
  - `categories`: Design Tools, Developer Tools
  - `license`: MIT
- [x] Command metadata properly defined
- [x] Preferences properly configured with defaults

### Functionality
- [x] All features work as documented
- [x] Search functionality works correctly
- [x] Multiple copy formats work
- [x] Keyboard shortcuts functional
- [x] Category filtering works
- [x] Grid and list views work
- [x] Theme support (light/dark mode) works
- [x] Settings/preferences functional

### Security & Performance
- [x] No hardcoded secrets or API keys
- [x] External URLs are safe (GitHub raw content)
- [x] Proper error handling implemented
- [x] Network requests have timeout handling
- [x] Memory-efficient data structures

### UI/UX
- [x] Icons display correctly
- [x] Responsive to different screen sizes
- [x] Keyboard navigation works smoothly
- [x] Actions are logical and intuitive
- [x] Default action is sensible (React Native component)
- [x] Subtitles show helpful information

## Step-by-Step Submission

### 1. Prepare Repository
```bash
# Ensure code is clean
npm run lint
npm run fix-lint  # if needed
npm run build

# Verify everything builds
npm run build
```

### 2. Clean Up & Commit
```bash
# Remove build artifacts and node_modules locally (optional)
rm -rf dist node_modules

# Commit final changes
git add .
git commit -m "Prepare for Raycast Store submission"
git push origin main
```

### 3. Run Publish Command
```bash
npm run publish
```

This will:
- Prompt you to sign in to Raycast
- Validate your extension
- Prepare it for submission
- Guide you through the submission form

### 4. Manual Submission (Alternative)
If `npm run publish` doesn't work:

1. Visit: https://www.raycast.com/extensions/submit
2. Fill in the form:
   - **Repository URL**: https://github.com/bruadam/coolicons
   - **Title**: Coolicons
   - **Description**: Search, preview and copy Coolicons. Pick icon style and copy as name, SVG, React or React Native component
   - **Category**: Design Tools, Developer Tools
   - **Author**: bruadam

### 5. After Submission
- Wait for Raycast team review
- They may request changes or clarifications
- Monitor your submission status
- Update the extension based on feedback

## Submission Requirements Met

✅ **Extension Quality**
- Well-structured code following Raycast patterns
- Clear documentation
- Proper error handling
- Intuitive user interface

✅ **Metadata**
- Accurate description
- Appropriate categories (Design Tools, Developer Tools)
- Clear command titles
- Well-documented preferences

✅ **Functionality**
- Core feature (search icons) works perfectly
- Multiple export formats
- Customizable preferences
- Category filtering
- Theme support

✅ **Performance**
- Efficient searching (442 icons loaded quickly)
- Lazy loading from GitHub URLs
- Minimal memory footprint
- Responsive UI

✅ **User Experience**
- Intuitive keyboard shortcuts
- Sensible default actions
- Clear visual feedback
- Multiple view options

## Common Rejection Reasons (Avoided)

✅ No hardcoded API keys or secrets
✅ Proper error handling with user feedback
✅ No unnecessary permissions
✅ Clean code following Raycast guidelines
✅ Comprehensive documentation
✅ Actual working features (not placeholder)

## Tips for Approval

1. **Respond quickly** to any Raycast team requests
2. **Test thoroughly** before resubmission
3. **Follow feedback** closely
4. **Update CHANGELOG** with any modifications
5. **Maintain code quality** in future updates

## Next Steps

1. Run the submission process
2. Await Raycast team review (typically 1-2 weeks)
3. Be responsive to feedback
4. Plan for regular maintenance updates
5. Promote the extension once approved

---

For more information, visit: https://developers.raycast.com/basics/prepare-an-extension-for-store
