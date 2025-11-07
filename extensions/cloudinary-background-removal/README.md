# Cloudinary Background Removal - Raycast Extension

Remove backgrounds from images using Cloudinary's AI-powered image processing, directly from Raycast.

## Features

- ✅ **Easy Configuration** - Set your Cloudinary credentials in Raycast preferences
- ✅ **Smart Fallback** - Tries AI method first, falls back to free methods
- ✅ **Auto File Detection** - Gets selected file from Finder automatically
- ✅ **Progress Updates** - See real-time status during processing
- ✅ **Multiple Formats** - Supports PNG, JPG, JPEG, GIF, WEBP

## Installation

1. **Install from Raycast Store** (when published)
   - Open Raycast
   - Go to Extensions → Browse Store
   - Search for "Cloudinary Background Removal"
   - Click Install

2. **Configure Your Credentials**
   - Open Raycast Preferences
   - Go to Extensions → Cloudinary Background Removal
   - Enter your **Cloudinary Cloud Name** (required)
   - Set **Upload Preset** (default: `background_removal_preset`)
   - Set **Output Directory** (default: `~/Downloads`)

## Setup Cloudinary

### 1. Create Cloudinary Account
- Sign up at [cloudinary.com](https://cloudinary.com/users/register_free) (free tier available)
- Get your cloud name from the dashboard

### 2. Create Upload Preset
1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Navigate to **Settings** → **Upload** → **Upload presets**
3. Click **Add upload preset**
4. Configure:
   - **Preset name**: `background_removal_preset`
   - **Signing mode**: `Unsigned`
5. Click **Save**

## Usage

### Method 1: Select in Finder (Recommended)
1. Select an image file in **Finder**
2. Open **Raycast** (`Cmd + Space`)
3. Type: `Remove Background`
4. Press Enter
5. Click **"Select File from Finder"** button
6. Click **"Remove Background"**

### Method 2: Enter File Path
1. Open Raycast
2. Type: `Remove Background`
3. Enter the file path manually
4. Click **"Remove Background"**

## How It Works

1. **Upload** - Image is uploaded to Cloudinary
2. **Process** - Background removal is applied (tries 3 methods)
3. **Download** - Processed image is saved to your output directory
4. **Open** - Result opens automatically in Preview

## Background Removal Methods

The extension tries three methods in order:

1. **AI Background Removal** (`e_background_removal`) - Best quality, requires add-on
2. **Auto-detect** (`e_bgremoval:auto`) - Free, works on uniform backgrounds
3. **Edge-based** (`e_make_transparent`) - Free, edge detection method

## Requirements

- macOS with Raycast installed
- Cloudinary account (free tier works)
- Upload preset created in Cloudinary

## Troubleshooting

### "Configuration error"
- Make sure you've set your Cloudinary cloud name in preferences
- Go to Raycast Preferences → Extensions → Cloudinary Background Removal

### "Upload failed"
- Verify your cloud name is correct
- Check that the upload preset exists in your Cloudinary account
- Ensure you have internet connection

### "All methods failed"
- Check if your image format is supported (PNG, JPG, JPEG, GIF, WEBP)
- Try a different image
- Verify your Cloudinary account is active

## Development

To develop this extension:

```bash
npm install
npm run dev
```

## License

MIT

## Credits

Created by [Milk Moon Studio](https://www.milkmoonstudio.com)

