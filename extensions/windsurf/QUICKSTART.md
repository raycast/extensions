# Windsurf Raycast Extension - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd ~/raycast-windsurf-extension
npm install
```

### Step 2: Start Development Mode
```bash
npm run dev
```

This opens Raycast in development mode with the extension loaded.

### Step 3: Open Raycast
- Press **Cmd + K** in Raycast (or your configured hotkey)
- Search for "Search Recent Projects" (or other Windsurf commands)
- The extension should appear

### Step 4: Test Basic Functionality
1. **Search Recent Projects**
   - Select the command
   - You should see your Windsurf recent projects
   - Click one to open in Windsurf
   - ✅ Working? Great!

2. **Pin a Project**
   - Click **Cmd + Shift + P** on any project
   - It moves to "Pinned Projects" section
   - ✅ Working? Excellent!

3. **View Git Branches**
   - If a project is in a git repo, you should see the branch name
   - ✅ Working? Perfect!

## ⚙️ Configuration

Open **Raycast Settings** → Find **Windsurf** extension:

- **View Layout**: Choose List or Grid
- **Close Other Windows**: Toggle behavior when opening projects
- **Show Git Branch**: Toggle branch display
- **Terminal App**: Select your preferred terminal

## 🐛 Troubleshooting

### "Failed to load recent projects"
1. Check Windsurf is installed: `which windsurf`
2. Verify `~/.windsurf/` directory exists
3. Open a project in Windsurf first to create the database
4. Restart Raycast (Cmd + Q, then open Raycast)

### Projects won't open
1. Verify Windsurf path: `which windsurf`
2. Test manual open: `open -a Windsurf`
3. Try: `windsurf ~/path/to/project`

### No recent projects showing
1. Windsurf database may not exist yet
2. Solution: Open 1-2 projects in Windsurf
3. Restart the extension (Cmd + Shift + P → "Reload Extension")

## 📚 Available Commands

### 1️⃣ Search Recent Projects
- **Hotkey**: Configurable
- **Features**:
  - Search by project name
  - Filter by type (Folder, Workspace, File)
  - Pin favorites
  - Show git branches

### 2️⃣ Open with Windsurf
- **How to use**: Select file/folder in Finder → Run this command
- **Result**: Opens selection in Windsurf

### 3️⃣ Open New Window
- **How to use**: Just run the command
- **Result**: Opens a new blank Windsurf window

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open in Windsurf | Click or Enter |
| Close Others | Cmd + Shift + Enter |
| Pin/Unpin | Cmd + Shift + P |
| Move Up (pinned) | Cmd + Opt + ↑ |
| Move Down (pinned) | Cmd + Opt + ↓ |
| Remove | Ctrl + X |
| Copy Name | Cmd + . |
| Copy Path | Cmd + Shift + . |
| Open with Default | Cmd + O |
| Open with Terminal | Cmd + Shift + O |

## 📖 Documentation

- **[README.md](README.md)** - Features & installation
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development & testing
- **[IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md)** - Technical details

## 🔧 Building & Publishing

### Build for Distribution
```bash
npm run build
```
Creates `dist/` folder with compiled extension.

### Publish to Raycast Store
```bash
npm run publish
```
Requires Raycast account and CLI authentication.

## 💡 Tips & Tricks

1. **Set a Hotkey**: In Raycast settings, set a quick hotkey for "Search Recent Projects"
2. **Pin Favorites**: Keep your 3-5 most used projects pinned for instant access
3. **Use Layout**: Switch to Grid view for visual browsing
4. **Git Display**: Enable if you work with multiple branches often

## 🐞 Report Issues

Found a bug? Create detailed info:
- macOS version
- Windsurf version/installation method
- Project structure (workspace vs folder)
- Error message from Raycast console

## 🤝 Contributing

Want to improve the extension? See [DEVELOPMENT.md](DEVELOPMENT.md) for:
- Code structure
- Testing guidelines  
- Enhancement ideas
- Pull request process

## ❓ FAQ

**Q: Does this affect my Windsurf settings?**
A: No, it only reads recent projects from Windsurf's database.

**Q: Can I remove Windsurf projects from Raycast without affecting Windsurf?**
A: Yes, removing from Raycast only affects Raycast's list.

**Q: Will this work with Cursor too?**
A: No, it's specifically for Windsurf. Use the official Cursor extension for Cursor.

**Q: How often is the recent projects list updated?**
A: It refreshes whenever you open Raycast or the command.

**Q: Can I customize the project display order?**
A: Yes, pin projects to reorder them in the Pinned section.

## 🎉 Next Steps

1. ✅ Install and run `npm run dev`
2. ✅ Test the main command
3. ✅ Pin your favorite projects
4. ✅ Configure preferences
5. ✅ Set a hotkey for quick access

**You're all set! Enjoy faster Windsurf project access! 🚀**
