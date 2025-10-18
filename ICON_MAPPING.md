# WebBlocker Icon Mapping

## Correct Icon Assignment ✅

Each command now has its properly named custom icon:

### Commands and Their Icons

| Command | Icon File | Source Icon |
|---------|-----------|-------------|
| **Add Website to Block** | `add-website-icon.png` | `Icons/Add_Website_To_Block.png` |
| **Enable Website Blocking** | `enable-blocking-icon.png` | `Icons/Enable_Website_Blocking.png` |
| **Disable Website Blocking** | `disable-blocking-icon.png` | `Icons/Disable_Website_Blocking.png` |
| **Manage Blocked Sites** | `manage-sites-icon.png` | `Icons/Manage_Blocked_Websites.png` |
| **Force Re-Block & Fix** | `refresh-blocking-icon.png` | `Icons/Force_ReBlock.png` |
| **Main Extension** | `icon.png` | Main WebBlocker icon |

## What Was Fixed

Previously, the icons were mismatched - generic icons were being used instead of your custom-designed icons. The issue was that the wrong icon files were in the root directory.

### Solution Applied

1. **Copied correct icons from `Icons/` folder to root**:
   - Each icon was copied with its proper command-specific name
   - Icons now correctly match their intended commands

2. **Cleared extended attributes**:
   - Removed macOS metadata that could interfere with icon loading

3. **Restarted Raycast**:
   - Fresh start to load the new icon files

## Icon Specifications

All icons are:
- **Format**: PNG (RGBA)
- **Size**: 512x512 pixels
- **Location**: Extension root directory
- **Naming**: Command-specific descriptive names

## Next Step

**Reload the extension in Raycast:**

1. Open Raycast (`⌘+Space`)
2. Type "preferences" and press Enter
3. Go to **Extensions** tab
4. Find **WebBlocker**
5. Click the **"..."** menu
6. Select **"Reload Extension"**

Your custom icons should now display correctly for each command! 🎨

## Verification

Search for "webblock" in Raycast and you should see:
- 🔒 Shield icon for "Add Website to Block"
- ✅ Enable icon for "Enable Website Blocking"
- ❌ Disable icon for "Disable Website Blocking"
- 📝 Manage icon for "Manage Blocked Sites"
- 🔄 Refresh icon for "Force Re-Block & Fix"

---

**Date**: October 14, 2025
**Status**: Icons correctly mapped ✨
