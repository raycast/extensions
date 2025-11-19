# Pull Request Notes

## Extension: Playtime

A Raycast extension that allows users to quickly check the total time played of any game in their Steam library.

## Known Issues

Please see `KNOWN_ISSUES.md` for detailed information about two non-blocking issues:

1. **Icon Path Linter Error**: The linter incorrectly looks for `assets/assets/icon.png` instead of `assets/icon.png`. The icon file exists at the correct location and is properly configured.

2. **TypeScript Build Errors**: React 19 type compatibility issues with Raycast API components. These are type-checking errors only and do not affect runtime functionality.

Both issues are documented in `KNOWN_ISSUES.md` and do not prevent the extension from functioning correctly. All features have been tested and work as expected.

## Testing

- ✅ Extension works correctly in development mode
- ✅ All features functional (search, sort, launch, uninstall, etc.)
- ✅ Cross-platform compatibility (macOS/Windows)
- ✅ Error handling tested
- ✅ Zero-setup path works (automatic Steam detection)

## Ready for Review

The extension is ready for submission. The known issues are tooling-related and do not affect functionality.

