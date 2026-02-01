# 🎨 ComfyUI Image Processor for Raycast

> Raycast extension for processing images via ComfyUI with custom workflows and prompts

[![Raycast](https://img.shields.io/badge/Raycast-Extension-red)](https://raycast.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.5+-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## 📦 What's included?

This project converts the Python script `multiimage_edit.py` into a full-featured Raycast extension with GUI.

### Main Features

- ✅ **Batch Image Processing** - Process multiple images at once
- ✅ **Custom Workflows** - Use any ComfyUI workflow
- ✅ **Custom Prompts** - Modify prompts without editing workflows
- ✅ **Prompt History** - Quick access to last 10 prompts
- ✅ **Home Assistant Integration** - Auto-start server
- ✅ **Workflow Management** - Browse, duplicate, delete workflows
- ✅ **Finder Integration** - Right-click images in Finder → Convert
- ✅ **Progress Tracking** - Monitor processing progress

## 🚀 Quick Start

```bash
# 1. Automatic installation
./install.sh

# 2. Import into Raycast
# Raycast → Import Extension → Select this folder

# 3. Configure preferences
# Server URL, Workflows Path, etc.

# 4. Done!
# Raycast → "ComfyUI Convert"
```

## 📚 Documentation

| File | Description |
|------|-------------|
| **README_EN.md** | Complete documentation with API reference |
| **QUICKSTART_EN.md** | Step-by-step installation guide |
| **CHEATSHEET_EN.md** | Quick reference with commands and tips |

## 📁 Project Structure

```
.
├── src/
│   ├── index.tsx                   # 🖼️ Main command (ComfyUI Convert)
│   ├── convert-from-finder.tsx    # 📂 Finder integration
│   ├── manage-workflows.tsx        # 🔧 Workflow management
│   └── utils/
│       └── comfyui.ts              # 🔌 ComfyUI API wrapper
│
├── package.json                    # 📦 NPM configuration
├── tsconfig.json                   # ⚙️ TypeScript config
├── .gitignore                      # 🚫 Git ignore
│
├── install.sh                      # 🚀 Installation script
├── create-icon.sh                  # 🎨 Icon helper
├── icon-template.svg               # 🖼️ SVG template
├── example-workflow.json           # 📝 Example workflow
│
└── Documentation files...
```

## ⚙️ Requirements

- **macOS** (Raycast is macOS only)
- **Raycast** 1.50.0+
- **Node.js** 18+
- **ComfyUI** server (running locally or remotely)

## 🔧 Configuration

### Required Settings (Raycast Preferences)

```
Server URL:        http://192.168.3.88:5000
Workflows Path:    ~/Documents/ComfyUI/workflows
Output Suffix:     _edited
```

### Optional (Home Assistant)

```
HA URL Internal:   http://192.168.3.114:8188
HA URL External:   http://188.75.144.234:8188
HA Token:          eyJhbGc...
ComfyUI Switch:    switch.comfyui
```

## 💡 Usage

### ComfyUI Convert (Main Command)

1. Open Raycast (`Cmd+Space`)
2. Type `ComfyUI Convert`
3. Select images (one or more) - OPTIONAL if using custom prompt
4. Select workflow
5. (Optional) Enter custom prompt
6. Press `Enter`

### Convert from Finder

1. Select images in Finder
2. Right-click → Raycast → "Convert with ComfyUI"
3. Select workflow and optionally add prompt
4. Press `Enter`

### Manage Workflows

1. Open Raycast
2. Type `Manage Workflows`
3. View all workflows with metadata
4. Use actions (open, duplicate, delete, etc.)

## 📸 Example Workflows

Extension includes `example-workflow.json` for testing.

### Minimal workflow structure:

```json
{
  "1": {
    "class_type": "LoadImage",
    "inputs": { "image": "placeholder.png" }
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": { "text": "beautiful photo" },
    "_meta": { "title": "Positive Prompt" }
  }
}
```

## 🛠️ Development

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Lint
npm run lint

# Fix lint issues
npm run fix-lint
```

## 🐛 Troubleshooting

### Extension won't import
- Check that `command-icon.png` exists
- Run `npm run build`
- Restart Raycast

### Server not available
- Verify ComfyUI is running: `curl http://YOUR_SERVER:5000/system_stats`
- Check URL in preferences
- If using HA, verify token and switch entity

### Workflow not working
- Export from ComfyUI as "Save (API Format)"
- Must contain `LoadImage` node
- Verify JSON syntax

## 🎯 Roadmap

- [ ] Support for multiple SaveImage nodes
- [ ] Batch export to different formats
- [ ] Preset management (saved workflow + prompt combinations)
- [ ] Progress notifications with preview
- [ ] Drag & drop support in Raycast
- [ ] Cloud workflow sync

## 📄 License

MIT License - use freely!

## 🙏 Credits

- Based on original Python script `multiimage_edit.py`
- Built on [Raycast API](https://developers.raycast.com/)
- Integration with [ComfyUI](https://github.com/comfyanonymous/ComfyUI)

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first.

---

**Made with ❤️ for productive AI image generation workflows**
