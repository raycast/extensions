# Setup Guide for Screenshot Feature

## Prerequisites

The screenshot word count feature requires Xcode to be installed for Swift compilation.

### Installing Xcode

1. **Download Xcode from the Mac App Store**
   - Open the Mac App Store
   - Search for "Xcode"
   - Click "Get" or "Install"
   - Wait for download and installation (Xcode is ~15GB)

2. **Set Xcode as the active developer directory**
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

3. **Verify installation**
   ```bash
   xcode-select -p
   ```
   Should output: `/Applications/Xcode.app/Contents/Developer`

4. **Accept Xcode license** (if prompted)
   ```bash
   sudo xcodebuild -license accept
   ```

## Building the Extension

Once Xcode is installed:

```bash
# Install npm dependencies
npm install

# Build the extension
npm run build
```

The build process will:
1. Compile TypeScript files
2. Compile Swift package
3. Generate TypeScript bindings for Swift functions
4. Bundle everything into the `dist` folder

## Testing the Feature

### Manual Testing

1. **Build and run in development mode**
   ```bash
   npm run dev
   ```

2. **In Raycast:**
   - Search for "Count from Screenshot"
   - Press Enter to trigger the command
   - Select a screen area with text
   - Verify the HUD shows correct counts

### Test Cases

Test the feature with:

- **English text**: Standard paragraphs, articles
- **CJK characters**: Chinese, Japanese, Korean text
- **Mixed content**: Text with numbers, punctuation
- **Empty screenshots**: Cancel capture or select blank area
- **Various fonts**: Different sizes, weights, styles
- **Different backgrounds**: Light/dark, colored backgrounds

### Expected Behavior

✅ **Success cases:**
- Clear text is recognized accurately
- Counts match manual verification
- HUD displays formatted results
- Cancellation (Esc) shows "No text detected"

❌ **Known limitations:**
- Very small text may not be recognized
- Low contrast text may be missed
- Handwritten text is not supported
- Stylized fonts may reduce accuracy

## Troubleshooting

### Build fails with "xcode-select: error"

**Problem**: Command Line Tools are installed but not full Xcode

**Solution**: Install Xcode from App Store and run:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

### "Cannot find module 'swift:../swift'"

**Problem**: TypeScript bindings not generated yet

**Solution**: Run `npm run build` - this generates the bindings

### OCR returns empty or incorrect text

**Possible causes:**
- Text is too small or blurry
- Poor contrast between text and background
- Unusual fonts or styling
- Text is rotated or skewed

**Solutions:**
- Ensure text is clear and readable
- Increase screenshot area
- Use higher contrast backgrounds
- Try with standard fonts first

### Build is very slow

**Explanation**: First Swift build compiles all dependencies and can take 2-5 minutes. Subsequent builds are much faster due to caching.

## Development Workflow

### Making Changes to Swift Code

1. Edit files in `swift/Sources/WordCount/`
2. Run `npm run build` to recompile
3. Test in Raycast with `npm run dev`

### Making Changes to TypeScript Code

1. Edit files in `src/`
2. Changes are hot-reloaded in dev mode
3. Run `npm run build` for production build

### Cleaning Build Artifacts

If you encounter build issues:

```bash
# Remove Swift build cache
rm -rf swift/.raycast-swift-build
rm -rf swift/.build

# Remove npm build artifacts
rm -rf dist

# Rebuild
npm run build
```

## Publishing

Before publishing the extension:

1. Ensure all tests pass
2. Update version in `package.json`
3. Update `CHANGELOG.md` with release date
4. Run `npm run build` to verify production build
5. Run `npm run publish` (requires Raycast Store access)

## Additional Resources

- [Raycast Extensions Documentation](https://developers.raycast.com/)
- [Swift for Raycast Extensions](https://github.com/raycast/extensions-swift-tools)
- [Apple Vision Framework](https://developer.apple.com/documentation/vision)
