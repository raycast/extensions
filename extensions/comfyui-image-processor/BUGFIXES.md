# 🔧 Fixes - Version 2.1

## ✅ What has been fixed:

### 1. **Saving files from text2img workflow** 
**Problem:** When you only used a prompt (without input images), ComfyUI generated files like `z-image_00002_.png`, but the script did not save them.

**Solution:**
-  ✅ The script now retains the original name from ComfyUI
-  ✅ Files are saved to the selected output folder with their original name
-  ✅ Works for multiple generated images as well

### 2. **Finder Integration** 
**Problem:** Right-clicking on files in Finder did not work - the action was not displayed.

**Solution:**
-  ✅ Added support for `getSelectedFinderItems()` API
-  ✅ The extension now correctly detects selected files from Finder
-  ✅ Works the same as the "Convert Images" extension

---

## 🎯 How it works now:

### Text2Image (without input images):
1. ComfyUI Convert
2. Do not select images
3. Select output folder: ~/Pictures/AI_Generated
4. Enter prompt: "sunset over ocean"
5. ComfyUI generates: z-image_00001_.png, z-image_00002_.png
6. ✅ Files are saved as:
   ~/Pictures/AI_Generated/z-image_00001_.png
   ~/Pictures/AI_Generated/z-image_00002_.png

### Image2Image (with input images):
1. Select: photo.jpg
2. ComfyUI processes
3. ✅ Saves as: photo_edited.jpg (next to the original)

### Finder Action:
1. Select images in Finder (Cmd+Click for multiple)
2. Right-click → Raycast
3. You should see: "Convert with ComfyUI"
4. Click → select workflow
5. ✅ Processes all selected files

---

## 📦 Installation of the fix:

```bash
# Navigate to the extension folder
cd ~/Desktop/comfyui-raycast-extension  # or wherever you have it

# Unzip the new ZIP (overwrites old files)
unzip -o ~/Downloads/comfyui-raycast-extension.zip

# Clean reinstall
rm -rf node_modules package-lock.json
npm install
npm run build


