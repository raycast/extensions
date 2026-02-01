# 📝 ComfyUI Image Processor - Cheat Sheet

## Quick Commands

### Installation
```bash
./install.sh                 # Automatic installation
npm install                  # Manual dependency installation
npm run build                # Build for production
npm run dev                  # Development mode (hot reload)

Creating an Icon

./create-icon.sh             # Automatic conversion from SVG → PNG

# Or manually:
convert -background none -resize 512x512 icon-template.svg command-icon.png
rsvg-convert -w 512 -h 512 icon-template.svg -o command-icon.png

Raycast Commands
After importing to Raycast:
  •  Process Images - Image Processing
  •  Manage Workflows - Workflow file management
Raycast Keyboard Shortcuts
Process Images
  •  Enter - Start processing
  •  Cmd+R - Refresh workflow list
Manage Workflows
  •  Enter - Open workflow
  •  Cmd+O - Open in Finder
  •  Cmd+C - Copy path
  •  Cmd+D - Duplicate workflow
  •  Cmd+Delete - Delete workflow
  •  Cmd+R - Refresh list
  •  Cmd+Shift+O - Open workflow folder
Project Structure

comfyui-image-processor/
├── src/
│   ├── index.tsx               # Main processing command
│   ├── manage-workflows.tsx    # Workflow management
│   └── utils/
│       └── comfyui.ts          # ComfyUI API functions
├── package.json                # NPM configuration
├── tsconfig.json               # TypeScript configuration
├── command-icon.png            # Icon (create it)
├── install.sh                  # Installation script
├── create-icon.sh              # Helper for creating icon
├── icon-template.svg           # SVG template for icon
├── example-workflow.json       # Example workflow
├── README.md                   # Complete documentation
├── QUICKSTART.md               # Quick start
└── ICON_README.md              # Icon info

Configuration (Raycast Preferences)
Required
  •  serverUrl:  http://192.168.3.88:5000
  •  workflowsPath:  ~/Documents/ComfyUI/workflows
  •  outputSuffix:  _edited
Optional (Home Assistant)
  •  haUrlInternal:  http://192.168.3.114:8188
  •  haUrlExternal:  http://188.75.144.234:8188
  •  haToken: (your token)
  •  comfyuiSwitch:  switch.comfyui
Workflow File (JSON)
Minimal structure:

{
  "1": {
    "class_type": "LoadImage",
    "inputs": { "image": "placeholder.png" }
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": { "text": "prompt here" },
    "_meta": { "title": "Positive Prompt" }
  }
}

Supported Node Types
LoadImage:
  •  LoadImage - To load an image
Prompt Nodes:
  •  PrimitiveStringMultiline (field:  value)
  •  CLIPTextEncode (field:  text)
  •  ImpactWildcardProcessor (field:  wildcard_text)
Common Issues
Extension is not imported
✓ Check  command-icon.png (must exist)
✓ Run  npm run build
✓ Restart Raycast
Server is unavailable
✓ Verify that ComfyUI is running
✓ Check URL in preferences
✓ Test:  curl http://192.168.3.88:5000/system_stats
Workflow doesn't work
✓ Must contain LoadImage node
✓ Export from ComfyUI as "API Format"
✓ Verify JSON syntax
Prompt is not applied
✓ Workflow must contain prompt node
✓ Node must have correct  _meta.title (e.g., "Positive Prompt")
✓ Check field name (text/value/wildcard_text)
Python Version (original script)

# Basic usage
python3 multiimage_edit.py workflow.json image.jpg

# With custom prompt
python3 multiimage_edit.py workflow.json image.jpg -prompt "portrait photo"

# Multiple images
python3 multiimage_edit.py workflow.json img1.jpg img2.jpg img3.jpg

# Entire folder
python3 multiimage_edit.py workflow.json ./images/

Useful Links
  • Raycast Docs
  • ComfyUI
  • Node.js Download
  • Online SVG→PNG
Tips & Tricks
  1.  Quick Image Selection: Use Raycast File Actions (select files in Finder → Raycast → Process Images)
  2.  Custom Keyboard Shortcut: Settings → Extensions → ComfyUI → Assign e.g., Cmd+Shift+I
  3.  Prompt History: Extension remembers the last 10 prompts
  4.  Batch Processing: Select multiple images at once (Cmd+Click in file picker)
  5.  Workflow Organization: Use descriptive names:
  ▪  portrait_enhance.json
  ▪  landscape_upscale.json
  ▪  photo_to_sketch.json
  6.  Custom Output Folder: Edit workflow and change SaveImage node path
  7.  Debug: Raycast logs can be accessed via Cmd+Shift+L