# 🚀 Quick Start - ComfyUI Image Processor

## Step-by-Step Installation

### 1. Prepare Environment

```bash
# Clone or download this project
cd comfyui-image-processor

# Install dependencies
npm install
```

### 2. Create Icon

Create file `command-icon.png` (512x512 px) in the project root folder.
Tip: Use SF Symbol or any PNG image.

### 3. Create Workflows Folder

```bash
# Create folder for workflow files
mkdir -p ~/Documents/ComfyUI/workflows

# Copy your .json workflow files from ComfyUI here
```

### 4. Configure ComfyUI Server

Make sure your ComfyUI server is running and accessible.

Test command:
```bash
curl http://192.168.3.88:5000/system_stats
```

### 5. Build Extension

```bash
# Development mode (hot reload)
npm run dev

# Or production build
npm run build
```

### 6. Import into Raycast

1. Open Raycast (Cmd+Space)
2. Type: `Import Extension`
3. Select this project folder
4. Click "Import"

### 7. Configure Preferences

In Raycast:
1. Open Settings (Cmd+,)
2. Find "ComfyUI Image Processor"
3. Set:
   - **Server URL**: e.g. `http://192.168.3.88:5000`
   - **Workflows Path**: e.g. `~/Documents/ComfyUI/workflows`
   - **Output Suffix**: e.g. `_edited`

### 8. First Use

#### Method 1: Main Command
1. Press Cmd+Space (Raycast)
2. Type: `ComfyUI Convert`
3. Select test image (optional)
4. Select workflow
5. Press Enter

#### Method 2: From Finder
1. Select images in Finder
2. Right-click → Raycast → "Convert with ComfyUI"
3. Select workflow
4. Press Enter

## 🎯 Example Workflow File

Create file `~/Documents/ComfyUI/workflows/test_workflow.json`:

```json
{
  "3": {
    "inputs": {
      "image": "placeholder.png"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Image"
    }
  },
  "6": {
    "inputs": {
      "text": "beautiful portrait photo, professional",
      "clip": ["11", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "Positive Prompt"
    }
  },
  "7": {
    "inputs": {
      "text": "ugly, blurry, low quality",
      "clip": ["11", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "Negative Prompt"
    }
  },
  "11": {
    "inputs": {
      "ckpt_name": "sd_xl_base_1.0.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  }
}
```

## 🔧 Troubleshooting

### Extension won't import
- Check that you have `command-icon.png` in root folder
- Run `npm run build` before importing
- Restart Raycast

### Server won't start
- Verify URL in preferences
- Check that ComfyUI is running
- Try pinging server: `ping 192.168.3.88`

### Workflow not working
- Open workflow in ComfyUI and export as API format
- Ensure it contains LoadImage node
- Check JSON syntax

## 📝 Next Steps

1. **Set keyboard shortcut**:
   - Settings → Extensions → ComfyUI Image Processor
   - Assign e.g. Cmd+Shift+I

2. **Create custom workflows**:
   - Export from ComfyUI (Save as API Format)
   - Save to workflows folder
   - Name descriptively (e.g. `portrait_enhance.json`)

3. **Use prompts**:
   - Check "Use custom prompt"
   - Extension remembers history
   - Quickly change style without editing workflow

## 🎉 Done!

Now you can process images directly from Raycast!

Tips:
- Use drag & drop for quick image selection
- Combine with File Actions in Raycast
- Create your own workflow collection for different purposes
- Right-click images in Finder for quick conversion
