# Raycast Store Requirements Checklist

This document verifies that the PBR Assistant extension meets all requirements from the [Raycast Store Preparation Guide](https://developers.raycast.com/basics/prepare-an-extension-for-store).

## ✅ Metadata and Configuration

### package.json Fields
- ✅ **Author**: `chad_ashley` - Should match your Raycast account username
- ✅ **License**: `MIT` - Correct
- ✅ **Platforms**: `["macOS", "Windows"]` - Correctly specified
- ✅ **API Version**: `^1.103.10` - Using recent version (verify latest if needed)
- ⚠️ **package-lock.json**: **MISSING** - Required for submission. Run `npm install` to generate it.

### Dependencies
- ✅ Using `npm` for dependencies
- ⚠️ **package-lock.json** must be included in PR

### Build & Lint
- ✅ Build script: `npm run build` exists
- ✅ Lint script: `npm run lint` exists
- ⚠️ **Action Required**: Run `npm run build` locally before submission
- ⚠️ **Action Required**: Run `npm run lint` to check for issues

## ✅ Extensions and Commands Naming

### Extension Title
- ✅ **"PBR Assistant"** - Follows Title Case (Apple Style Guide)
- ✅ Clear and descriptive noun
- ✅ Not generic, specific to functionality

### Extension Description
- ✅ One sentence description: "This extension helps 3D artists find physically accurate PBR diffuse colors as well as IOR values."
- ✅ Short and descriptive

### Command Title
- ✅ **"Find PBR/IOR Value"** - Follows `<verb> <noun>` structure
- ✅ No articles ("a", "an", "the")
- ✅ Specific about what the command does

### Command Subtitle
- ✅ **"PBR Assistant"** - Adds context (service name)
- ✅ Not used as description
- ⚠️ **Note**: For single-command extensions, subtitle might be redundant, but it's acceptable per guidelines

## ✅ Extension Icon

- ✅ Icon file exists: `assets/extension-icon.png`
- ⚠️ **Action Required**: Verify icon is 512x512px PNG format
- ⚠️ **Action Required**: Verify icon looks good in both light and dark themes
- ✅ Not using default Raycast icon

## ✅ README

- ✅ README.md exists at root
- ✅ Clear usage instructions
- ✅ No additional configuration required (no API keys needed)
- ✅ Platform support documented

## ✅ Categories

- ✅ At least one category: `"Design Tools"`
- ✅ Follows Title Case convention
- ✅ Case-sensitive and correct

## ⚠️ Screenshots

- ⚠️ **Action Required**: Add screenshots to showcase functionality
- Screenshots should be clear and relevant
- Consider showing both IOR list view and PBR color grid view

## ✅ Version History (CHANGELOG)

- ✅ CHANGELOG.md exists
- ✅ Follows correct format with square brackets
- ✅ Uses `{PR_MERGE_DATE}` placeholder (will be filled by Raycast)
- ✅ Includes bullet points of features

## ✅ Binary Dependencies

- ✅ No binary dependencies
- ✅ No additional downloads required
- ✅ No platform-specific binaries

## ✅ Keychain Access

- ✅ No Keychain access required
- ✅ No security concerns

## ✅ UI/UX Guidelines

### Action Panel
- ✅ Actions use Title Case: "Copy to Clipboard", "Paste"
- ✅ Icons provided for dropdown items (Icon.Brush, Icon.Globe)
- ✅ Consistent icon usage

### Navigation
- ✅ Using standard Raycast components (List, Grid)
- ✅ No custom navigation stack
- ✅ Proper use of Raycast Navigation API

### Empty States
- ✅ Lists are populated with data (no empty arrays on load)
- ✅ No flickering empty state issues

### Navigation Title
- ✅ Not changing navigationTitle in root command (uses default)
- ✅ No long or dynamic titles

### Placeholders
- ✅ Search bars have placeholders:
  - "Search IOR values..."
  - "Search PBR colors..."

### Analytics
- ✅ No external analytics included

### Localization
- ✅ Using US English spelling
- ✅ No custom localization

## ⚠️ Action Items Before Submission

1. **Generate package-lock.json**: Run `npm install` to create the file
2. **Verify icon**: Ensure `extension-icon.png` is 512x512px and looks good in light/dark themes
3. **Run build**: Execute `npm run build` and test the extension
4. **Run lint**: Execute `npm run lint` and fix any issues
5. **Add screenshots**: Create screenshots showing the extension in action
6. **Verify author**: Confirm `chad_ashley` matches your Raycast account username
7. **Check API version**: Verify `@raycast/api` version is current (currently `^1.103.10`)

## Summary

**Status**: ✅ **Mostly Ready** - Minor fixes needed

The extension meets most requirements. The main items to address before submission are:
- Generate `package-lock.json`
- Verify icon specifications
- Add screenshots
- Run build and lint checks
- Verify author username matches Raycast account


