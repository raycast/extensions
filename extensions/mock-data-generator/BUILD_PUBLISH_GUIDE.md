# Build & Publish Guide

Quick reference for building, testing, and publishing the Mock Data Generator extension to the Raycast Store.

## 📋 Pre-Publish Checklist

Before publishing, ensure you've completed these steps:

- [ ] Read the [extension guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [ ] Read the [documentation about publishing](https://developers.raycast.com/basics/publish-an-extension)
- [ ] Run `npm run build` and tested the distribution build in Raycast
- [ ] Verified files in `assets/` folder are used by the extension itself
- [ ] Verified assets used by `README.md` are in `images/` folder (NOT in `metadata/`)
- [ ] Screenshots in `metadata/` folder are **2000x1250px**

## 🛠️ Development Commands

### Install Dependencies
```bash
npm install
```

### Run in Development Mode
```bash
npm run dev
```
This starts the extension in development mode with hot reloading.

### Lint Code
```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run fix-lint
```

### Build for Production
```bash
npm run build
```

## 📸 Screenshot Requirements

Screenshots must be placed in the `metadata/` folder and meet these requirements:

- **Dimensions:** 2000x1250 pixels (exact)
- **Format:** PNG
- **Naming:** Descriptive names (e.g., `initial-form.png`, `generated-code.png`)

### Resize Screenshots with FFmpeg

If your screenshots are the wrong size, use this command:

```bash
ffmpeg -i "input.png" -vf "scale=2000:1250:force_original_aspect_ratio=decrease,pad=2000:1250:(ow-iw)/2:(oh-ih)/2:black" "output.png"
```

### Current Screenshots
- `metadata/initial-form.png`
- `metadata/form-language-select.png`
- `metadata/form fields.png`
- `metadata/mock-data-example.png`
- `metadata/generate-mock-data-demo.gif`

## 📁 Folder Structure

```
mock-data-generator/
├── assets/              # Extension icon (used by extension)
│   └── extension_icon.png
├── images/              # README images (NOT for store)
│   ├── generate-mock-data-demo.gif
│   ├── initial-form.png
│   └── ...
├── metadata/            # Store screenshots (2000x1250px)
│   ├── generate-mock-data-demo.gif
│   ├── initial-form.png
│   └── ...
├── src/                 # Source code
├── generators/          # Code generators
├── constants/           # Type mappings
├── types/               # TypeScript types
├── utils/               # Utility functions
├── package.json
├── README.md
└── CHANGELOG.md
```

## 🚀 Publishing

### First-Time Setup

1. Make sure you're logged into GitHub in your terminal
2. The extension directory name must match the `name` field in `package.json`

### Publish Command

```bash
npm run publish
# or
npx @raycast/api@latest publish
```

### What Happens During Publish

1. **Validation** - Checks `package.json`, icons, metadata
2. **Linting** - Runs ESLint and Prettier
3. **Fork** - Creates/updates fork of `raycast/extensions`
4. **Clone** - Clones to `~/.config/raycast-x/public-extensions-fork`
5. **Copy** - Copies your extension to `extensions/mock-data-generator/`
6. **Push** - Pushes to your fork
7. **PR** - Opens a Pull Request to `raycast/extensions`

### After Publishing

1. Go to the PR link provided
2. Add a description summarizing your changes
3. Include a screencast (GIF or MP4) demonstrating the extension
4. Check all the boxes in the PR template
5. Mark as "Ready for review"

## 🔄 Updating an Existing Extension

1. Make your changes
2. Update version in `package.json`
3. Update `CHANGELOG.md`
4. Run lint and build
5. Commit and push to your repo
6. Run `npm run publish`

The CLI will update your existing PR or create a new one.

## ⚠️ Common Issues

### "Nothing new to publish"
- Make sure your changes are committed
- Check that the extension folder name matches `package.json` name
- Try deleting the cache: `rm -rf ~/.config/raycast-x/public-extensions-fork`

### "EBUSY: resource busy"
- Close any file explorers or editors looking at the cache folder
- Wait a moment and try again

### Image Size Validation Failed
- Ensure screenshots are exactly 2000x1250 pixels
- Use the FFmpeg command above to resize

### Missing package-lock.json
- Run `npm install` to generate it
- Raycast requires npm (not just bun.lock)

## 📝 Version Bumping

When releasing updates:

```json
// package.json
{
  "version": "1.0.0"  // Bump this
}
```

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

## 🔗 Useful Links

- [Raycast Extension Guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Publishing Documentation](https://developers.raycast.com/basics/publish-an-extension)
- [Raycast API Reference](https://developers.raycast.com/api-reference)
- [Your Extension PR](https://github.com/raycast/extensions/pulls?q=author%3Akiing-dom)
- [Raycast Store](https://raycast.com/store)
