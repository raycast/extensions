# Publishing to Raycast Store

## Prerequisites

1. **Raycast Developer Account**
   - Sign up at [raycast.com](https://raycast.com)
   - Join the developer program

2. **Extension Ready**
   - Code complete and tested
   - Icon created (512x512px)
   - README updated
   - All preferences configured

## Steps to Publish

### 1. Prepare Extension

1. **Update package.json**
   - Set your `author` name
   - Add proper `description`
   - Ensure `version` is set (start with `1.0.0`)

2. **Create Icon**
   - Design 512x512px icon
   - Save as `assets/icon.png`
   - Should represent the extension clearly

3. **Test Thoroughly**
   ```bash
   npm run dev
   ```
   - Test all features
   - Test error cases
   - Test preferences

### 2. Build Extension

```bash
npm run build
```

This creates the `dist/` folder with compiled code.

### 3. Submit for Review

1. **Login to Raycast**
   ```bash
   npm run publish
   ```
   - This opens the publishing interface
   - Or go to [Raycast Developer Portal](https://developers.raycast.com)

2. **Fill Submission Form**
   - Extension name
   - Description
   - Screenshots (optional but recommended)
   - Category
   - Tags

3. **Submit**
   - Raycast team reviews
   - Usually takes a few days
   - You'll get feedback if changes needed

## Requirements for Store

✅ **Working Code** - All features functional  
✅ **Proper Icon** - 512x512px PNG  
✅ **Documentation** - Clear README  
✅ **Preferences** - User-configurable settings  
✅ **Error Handling** - Graceful error messages  
✅ **No Hardcoded Credentials** - All in preferences  

## After Publishing

- Users can install from Raycast Store
- You can update via `npm run publish`
- Monitor usage and feedback
- Respond to issues

## Resources

- [Publishing Guide](https://developers.raycast.com/information/publish-an-extension)
- [Extension Examples](https://github.com/raycast/extensions)
- [Store Guidelines](https://developers.raycast.com/information/prepare-an-extension-for-store)

