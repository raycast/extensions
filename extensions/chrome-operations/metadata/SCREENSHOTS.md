# Screenshots Guide

This extension requires at least 3 screenshots (maximum 6) for the Raycast Store.

## How to Create Screenshots

### Using Raycast Window Capture

1. Open Raycast Preferences → Advanced
2. Enable Window Capture and set a hotkey (e.g., `⌘⇧⌥+M`)
3. Start your extension in development mode: `npm run dev`
4. Open the command in Raycast
5. Press your Window Capture hotkey
6. Make sure to check "Save to Metadata"
7. The screenshot will be saved to `metadata/` directory

### Screenshot Requirements

- **Resolution:** 2000 x 1250 pixels (landscape)
- **Background:** Use a high-contrast, consistent background across all screenshots
- **Content:** Show only your extension within Raycast (no other apps)
- **Theme:** Use a single theme (light or dark) for all screenshots
- **Privacy:** Do not include sensitive data or personal information

### Recommended Screenshots

1. **Open URL in Chrome** - Show the command ready to open a URL from Safari
2. **Open Chrome Incognito Mode** - Show the incognito mode command
3. **Both Commands** - Show both commands listed in Raycast search

### Screenshot Creation Checklist

- [ ] 3-6 screenshots created
- [ ] All screenshots are 2000x1250 pixels
- [ ] Consistent background across all screenshots
- [ ] No sensitive data visible
- [ ] Only showing the extension in Raycast
- [ ] Good contrast and clarity

### Background Resources

Use Raycast Wallpapers to find a suitable background:
- Search "Raycast Wallpapers" in Raycast
- Choose a wallpaper with good contrast
- Set it as your desktop background
- Use it consistently across all screenshots

### After Creating Screenshots

1. Move screenshots to `metadata/` directory
2. Name them appropriately (e.g., `open-url-in-chrome.png`, `open-incognito.png`)
3. Verify they meet all requirements above
4. Commit them to the repository
