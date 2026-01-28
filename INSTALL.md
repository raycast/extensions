# Installation Guide

## Quick Start

### Step 1: Install Dependencies

```bash
cd codexbar-raycast
npm install
```

### Step 2: Add Icons (Important!)

The extension needs icon files. You have two options:

**Option A: Use the provided SVG (Convert to PNG)**

Convert `assets/icon-generator.svg` to PNG in 3 sizes:
- `command-icon.png` - 512x512 pixels
- `menu-bar-icon.png` - 16x16 pixels (monochrome, transparent)
- `preferences-icon.png` - 256x256 pixels

Use an online converter like:
- https://convertio.co/svg-png/
- https://cloudconvert.com/svg-to-png

**Option B: Download Pre-made Icons**

1. Go to https://icones.js.org/
2. Search for an AI/robot/brain icon (like `mdi:robot` or `carbon:machine-learning`)
3. Download as PNG in required sizes

**Option C: Use Text Placeholder (Quick Test)**

Create empty files (not recommended for production):
```bash
touch assets/command-icon.png
touch assets/menu-bar-icon.png  
touch assets/preferences-icon.png
```

### Step 3: Run in Development Mode

```bash
npm run dev
```

This will:
1. Build the extension
2. Open Raycast
3. Load the extension from source

You'll see the extension in Raycast immediately!

### Step 4: Test Commands

Try these in Raycast:
- "Show AI Usage" - Main command
- Look for "CodexBar Menu Bar" in menu bar
- "Configure Providers" - Settings

---

## Building for Production

### Build

```bash
npm run build
```

Creates optimized files in `dist/` folder.

### Package for Distribution

```bash
npm run package
```

Creates: `codexbar-raycast.raycast-extension`

This file can be shared with others!

---

## Installing a Packaged Extension

If you have a `.raycast-extension` file:

1. Open Raycast
2. Type "Import Extension"
3. Select the `.raycast-extension` file

Or manually:

```bash
# The .raycast-extension file is just a zip
# Extract it to:
# macOS: ~/Library/Application Support/com.raycast.macos/extensions/
# Windows: %APPDATA%\Raycast\extensions\
```

---

## Installing from Source

### Method 1: Development Mode (Easiest)

```bash
cd codexbar-raycast
npm install
npm run dev
```

Extension loads automatically in Raycast.

### Method 2: Import Local Extension

```bash
# Build first
npm run build

# In Raycast:
# 1. Type "Manage Extensions"
# 2. Click "+" or "Import Extension"
# 3. Select the codexbar-raycast folder
```

---

## Publishing to Raycast Store

### Requirements

1. Fork [raycast/extensions](https://github.com/raycast/extensions)
2. Create a new folder: `extensions/codexbar/`
3. Copy your extension files
4. Submit a PR

### Steps

```bash
# 1. Fork the repo on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/extensions.git

# 3. Copy extension
cp -r codexbar-raycast extensions/extensions/codexbar

# 4. Commit and push
cd extensions
git add .
git commit -m "Add CodexBar extension"
git push origin main

# 5. Create PR on GitHub
```

---

## Troubleshooting

### "Icon not found" error

Add the PNG icons to `assets/` folder:
```bash
# Ensure these files exist:
assets/command-icon.png
assets/menu-bar-icon.png
```

### "Build failed" error

```bash
# Clean and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### Extension not appearing in Raycast

1. Make sure `npm run dev` is running
2. In Raycast, type "Reload Script Directories"
3. Check the Raycast Extensions preferences

### TypeScript errors

```bash
npm run typecheck
```

---

## Windows-Specific Notes

### PowerShell Commands

```powershell
# Install dependencies
npm install

# Run in dev mode
npm run dev

# Build
npm run build
```

### Icon Conversion on Windows

1. Open `assets/icon-generator.svg` in browser
2. Take screenshot and crop to square
3. Or use PowerShell with ImageMagick:
```powershell
# Install ImageMagick first
magick convert assets/icon-generator.svg -resize 512x512 assets/command-icon.png
magick convert assets/icon-generator.svg -resize 16x16 assets/menu-bar-icon.png
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Development mode |
| `npm run build` | Production build |
| `npm run package` | Create installable package |
| `npm run lint` | Check code quality |
| `npm run typecheck` | Check TypeScript |
