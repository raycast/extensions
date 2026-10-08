# Publishing to Raycast Store - Checklist

## ✅ Completed

- [x] **package.json** has all required fields (name, title, description, author, contributors, categories, license)
- [x] **package-lock.json** exists (using npm)
- [x] **README.md** with setup instructions and usage
- [x] **CHANGELOG.md** created
- [x] **Icon** exists (512x512px minimum) - Note: Consider converting to true PNG format
- [x] **MIT License** declared
- [x] **.gitignore** updated to exclude test files

## 📸 TODO: Take Screenshots

1. **Setup Window Capture in Raycast:**
   - Open Raycast Settings → Extensions → Raycast
   - Assign a keyboard shortcut to "Window Capture"

2. **Take Screenshots (2000x1250px PNG):**
   - Run `npm run dev` to start your extension in development mode
   - Open Raycast and search for "Search Standard Library"
   - Press your Window Capture shortcut
   - This removes the green dev icon and shows proper frame
   - Take 1-3 screenshots showing:
     - Main search view with results
     - Detail view showing documentation
     - (Optional) Different search results

3. **Save Screenshots:**
   - Save them in the `metadata/` folder
   - Name them descriptively (e.g., `rust-docs-1.png`, `rust-docs-2.png`)

## 🔍 Pre-Publish Validation

Run these commands to verify everything works:

```bash
# 1. Verify build works
npm run build

# 2. Run linting
npm run lint

# 3. Fix any lint issues
npm run fix-lint
```

## 🚀 Publishing Steps

### Option 1: Automated (Recommended)

```bash
npm run publish
```

This will:
- Validate your extension
- Guide you through the submission process
- Create a PR automatically to the Raycast extensions repository

### Option 2: Manual

1. **Fork the Raycast Extensions Repository:**
   - Go to https://github.com/raycast/extensions
   - Click "Fork" button

2. **Add Your Extension:**
   ```bash
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/extensions.git
   cd extensions
   
   # Create a new branch
   git checkout -b add-rust-documentation
   
   # Copy your extension to the extensions folder
   cp -r /path/to/raycast-rust-extension extensions/rust-docs
   
   # Commit and push
   git add extensions/rust-docs
   git commit -m "Add Rust Documentation extension"
   git push origin add-rust-documentation
   ```

3. **Create Pull Request:**
   - Go to your fork on GitHub
   - Click "Contribute" → "Open pull request"
   - Fill in the PR description
   - Submit for review

## 📋 Review Process

- **First contact:** Within 1 week
- **Review:** First-in, first-out basis
- **Response required:** You must respond to reviewer comments
- **Stale PRs:** Closed after 21 days of inactivity

## 📝 After Publishing

Once approved and merged:
1. Your extension will be automatically published to the Raycast Store
2. Share it with the community using the "Manage Extensions" command
3. Copy the link with `⌘⌥.` and share on social media

## 🔗 Useful Links

- [Prepare Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension)
- [Extension Guidelines](https://manual.raycast.com/extensions)
- [Raycast Extensions Repository](https://github.com/raycast/extensions)

## ⚠️ Important Notes

- Ensure your extension works before submitting
- Test in both light and dark themes
- Make sure icon looks good in both themes
- Clean up any test/development files
- Update README if any setup is required
