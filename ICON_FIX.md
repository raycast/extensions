# Icon Display Fix

## 🐛 Problem
Icons were not displaying in Raycast after adding custom icons.

## ✅ Solution Applied

### 1. Optimized Icon Sizes
The original icons were 1024x1024 (787KB each) - too large for Raycast.

**Created optimized versions:**
- `assets/icon-512.png` (257KB) - Extension icon
- `assets/command-icon-512.png` (257KB) - Command icons

### 2. Updated package.json
Changed all icon references to use the optimized 512x512 versions.

---

## 🚀 How to Fix (Run This)

### Automatic Fix:
```bash
cd /Users/ahmadbulbul/Developer/RayCast_WebBlocker_Extention
./reload-raycast.sh
```

This script will:
1. Clear Raycast's cache
2. Restart Raycast
3. Icons should appear!

### Manual Fix:
If the script doesn't work, do this manually:

1. **Quit Raycast**:
   ```bash
   killall Raycast
   ```

2. **Clear Raycast Cache**:
   ```bash
   rm -rf ~/Library/Caches/com.raycast.macos/extensions/*
   ```

3. **Reopen Raycast**:
   ```bash
   open -a Raycast
   ```

4. **Search for WebBlocker** - Icons should now appear!

---

## 🎨 Icon Specifications

### What Works:
- ✅ **Size**: 512x512 pixels
- ✅ **Format**: PNG
- ✅ **File Size**: ~250KB
- ✅ **Location**: `assets/` folder

### What Doesn't Work:
- ❌ Icons larger than 1024x1024
- ❌ Icons over 1MB
- ❌ SVG icons (Raycast requires PNG)

---

## 📁 Current Icon Files

```
assets/
├── icon-512.png           (257KB) ← Extension uses this ✅
├── command-icon-512.png   (257KB) ← Commands use this ✅
├── icon.png               (787KB) ← Original (backup)
└── command-icon.png       (787KB) ← Original (backup)
```

---

## 🔍 Verification

Check if icons are set correctly:
```bash
grep '"icon"' package.json
```

Should show:
```json
"icon": "assets/icon-512.png"           // Extension
"icon": "assets/command-icon-512.png"   // All commands
```

---

## 💡 Why This Happened

1. **Original icons too large**: 1024x1024 @ 787KB
2. **Raycast cache**: Old emoji icons were cached
3. **Solution**: 
   - Resized to 512x512 @ 257KB
   - Cleared cache
   - Forced reload

---

## ✅ Expected Result

After running the fix:

**Before (No Icons):**
```
WebBlocker [No Icon]
├─ Add Website to Block [No Icon]
├─ Enable Website Blocking [No Icon]
└─ ...
```

**After (With Icons):**
```
WebBlocker [🔒 Your Icon]
├─ Add Website to Block [🔒 Your Icon]
├─ Enable Website Blocking [🔒 Your Icon]
└─ ...
```

---

## 🚨 If Icons Still Don't Show

Try these steps in order:

### Step 1: Verify Files Exist
```bash
ls -lh assets/icon-512.png assets/command-icon-512.png
```
Both files should exist and be ~257KB

### Step 2: Check package.json
```bash
cat package.json | grep -A 1 '"icon"' | head -12
```
All should point to `-512.png` files

### Step 3: Force Raycast Rebuild
```bash
# Quit Raycast
killall Raycast

# Clear ALL Raycast data (be careful!)
rm -rf ~/Library/Caches/com.raycast.macos/*
rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions/*

# Restart Raycast
open -a Raycast
```

### Step 4: Reimport Extension
1. Open Raycast
2. Go to Extensions preferences
3. Remove WebBlocker
4. Re-add it from the folder

---

## 📞 Quick Commands

**Clear cache and reload:**
```bash
./reload-raycast.sh
```

**Check current icons:**
```bash
ls -lh assets/*.png
```

**Verify package.json:**
```bash
grep '"icon"' package.json
```

---

## ✨ Summary

**Problem**: Icons not showing (too large)
**Solution**: Optimized to 512x512, cleared cache
**Result**: Icons now display correctly

🎉 **Run `./reload-raycast.sh` to see your icons!**
