# Force Icon Reload - Manual Steps Required

## The Issue

Raycast aggressively caches extension icons. Even after updating the icon files and clearing all caches, Raycast may still show the old cached icons. The **only guaranteed solution** is to remove and re-import the extension.

## ✅ Verified: Correct Icons ARE In Place

I've verified that the correct icon files are now in the root directory:

```bash
✅ add-website-icon.png      (from Icons/Add_Website_To_Block.png)
✅ enable-blocking-icon.png   (from Icons/Enable_Website_Blocking.png)
✅ disable-blocking-icon.png  (from Icons/Disable_Website_Blocking.png)
✅ manage-sites-icon.png      (from Icons/Manage_Blocked_Websites.png)
✅ refresh-blocking-icon.png  (from Icons/Force_ReBlock.png)
```

The MD5 hashes confirm these are your correct custom icons.

## 🔧 Solution: Remove and Re-import Extension

This is the ONLY way to guarantee Raycast will load the new icons:

### Step 1: Open Raycast Preferences
1. Press `⌘+Space` to open Raycast
2. Type: `preferences`
3. Press Enter

### Step 2: Remove the Extension
1. Click the **Extensions** tab
2. Scroll down to find **WebBlocker**
3. Click on **WebBlocker** to select it
4. Click the **"Remove Extension"** button (or use the "..." menu)
5. Confirm the removal

### Step 3: Re-import the Extension
1. Still in Extensions tab, click the **"+"** button in the top-right
2. Select **"Import Extension"**
3. Navigate to: `/Users/ahmadbulbul/Developer/RayCast_WebBlocker_Extention`
4. Click **"Import"**

### Step 4: Verify Icons
1. Press `⌘+Space` to open Raycast
2. Type: `webblock`
3. You should now see your custom icons for each command! 🎨

## Expected Result

After re-importing, each command should show its unique custom icon:

| Command | Expected Icon |
|---------|--------------|
| Add Website to Block | Your custom "Add" icon (shield/plus style) |
| Enable Website Blocking | Your custom "Enable" icon (green checkmark style) |
| Disable Website Blocking | Your custom "Disable" icon (red X style) |
| Manage Blocked Sites | Your custom "Manage" icon (list/document style) |
| Force Re-Block & Fix | Your custom "Refresh" icon (circular arrow style) |

## Why This Is Necessary

Raycast caches extension metadata and icons in multiple locations:
- Memory cache (process-level)
- Disk cache (filesystem-level)
- Extension metadata cache
- Image rendering cache

Even after clearing all disk caches, the in-memory cache persists. The only way to completely reset this is to remove and re-import the extension, which forces Raycast to:
1. Unload all extension data from memory
2. Delete all cached metadata
3. Re-scan the extension directory
4. Re-load all icons fresh

## Alternative (If Above Doesn't Work)

If after re-importing the icons STILL don't change, try this:

1. Quit Raycast completely (`⌘+Q`)
2. Run this command in Terminal:
   ```bash
   rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions
   rm -rf ~/Library/Caches/com.raycast.macos
   ```
3. Restart your Mac (yes, really!)
4. Open Raycast and import the extension again

## Support

If icons still don't show correctly after all of this, there may be an issue with how Raycast renders your specific PNG files. In that case, we may need to re-export the icons with different settings.

---

**Status**: Correct icons are in place, just need manual re-import ✅
**Date**: October 14, 2025
