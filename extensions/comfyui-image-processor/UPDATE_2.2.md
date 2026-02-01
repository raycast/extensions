# 🎉 Update 2.2 - English + Unified + Icon Fixed

## ✨ What's New:

### 1. **Complete English Translation** 🌍
All text in the extension is now in English:
- ✅ Form labels and buttons
- ✅ Error messages
- ✅ Success notifications
- ✅ Tooltips and descriptions

### 2. **Unified Command** 🔄
Merged "ComfyUI Convert" and "Convert with ComfyUI" into ONE command:
- ✅ Works from Raycast directly (manual file selection)
- ✅ Works from Finder (right-click on files)
- ✅ Auto-detects Finder selection

**How it works:**
- **From Finder**: Select files → Right-click → Raycast → "ComfyUI Convert"
- **From Raycast**: Cmd+Space → "ComfyUI Convert" → Select files manually

### 3. **Icon Fixed** 🎨
- ✅ Included `command-icon.png` (512x512 blue with white "C")
- ✅ No more empty icon box in Raycast!

### 4. **Smart File Extension Detection** 📄
Extension now detects and preserves ComfyUI's output format:
- ✅ If ComfyUI outputs `.png` → saves as `.png`
- ✅ If ComfyUI outputs `.webp` → saves as `.webp`  
- ✅ If ComfyUI outputs `.jpg` → saves as `.jpg`
- ✅ Original filename preserved for text2img

---

## 🎯 How to Use:

### Method 1: From Finder (NEW!)
```
1. Select 1 or more images in Finder
2. Right-click
3. Raycast → "ComfyUI Convert"
4. Extension automatically detects selected files!
5. Choose workflow
6. Done!
```

### Method 2: From Raycast
```
1. Cmd+Space
2. Type "ComfyUI Convert"
3. Click "Add Files" to select images
4. OR skip files and use custom prompt
5. Choose workflow
6. Done!
```

---

## 📦 Installation:

```bash
# Go to your extension folder
cd ~/Desktop/comfyui-raycast-extension

# Extract new version (overwrite)
unzip -o ~/Downloads/comfyui-raycast-extension.zip

# Clean reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

Raycast will auto-reload!

---

## ✅ Verify It Works:

### 1. Check Icon:
```
Raycast → Extensions
Look for "ComfyUI Image Processor"
Should see blue icon with "C"
```

### 2. Test Finder Integration:
```
1. Open Finder
2. Select 2-3 images
3. Right-click
4. Look for Raycast section
5. Click "ComfyUI Convert"
6. Should show "Files from Finder: Selected 3 files"
```

### 3. Test File Extension:
```
1. Process an image
2. Check if ComfyUI outputs PNG or WEBP
3. Verify saved file has correct extension
```

---

## 🔍 Troubleshooting:

### Icon still not showing:
```bash
# Make sure file exists
ls -lh command-icon.png

# Should show: ~82KB PNG file
# If not, download from: https://via.placeholder.com/512/6366F1/FFFFFF?text=C
```

### Finder action not working:
```
1. Restart Raycast (Cmd+Q)
2. System Preferences → Privacy → Files and Folders
3. Make sure Raycast has permission
4. Try again
```

---

**Version: 2.2**  
**Date: 2026-02-01**  
**Changes: Full English translation, unified command, icon fix, smart extension detection**
