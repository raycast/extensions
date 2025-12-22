# Setup Instructions

## Before You Start

1. **Update Author**: Edit `package.json` and replace `"your-username"` with your Raycast username/author name.

2. **Add Icon**:
   - Create a 512x512 pixel PNG icon
   - Save it as `assets/icon.png`
   - Optionally add `assets/icon@dark.png` for dark mode support

## Installation Steps

1. **Install Dependencies**:

   ```bash
   cd /Users/jace/Desktop/launchpad-folders
   npm install
   ```

2. **Start Development Mode**:

   ```bash
   npm run dev
   ```

3. **Import Extension in Raycast**:
   - Open Raycast
   - Go to Extensions
   - Click "Import Extension"
   - Select the `launchpad-folders` folder
   - The extension should now appear in your extensions list

## Testing

1. Search for "Launchpad Folders" in Raycast
2. You should see an empty state prompting you to create a folder
3. Search for "Manage Folders" to create your first folder
4. Add some applications to test the functionality

## Features to Test

- ✅ Create a new folder
- ✅ Add applications to a folder
- ✅ Add nested folders to a folder
- ✅ Search for folders
- ✅ Open folder contents (press Enter on a folder)
- ✅ Launch applications from folder contents
- ✅ Edit existing folders
- ✅ Delete folders

## Troubleshooting

- If you see import errors, make sure you've run `npm install`
- If commands don't appear, make sure you've imported the extension in Raycast
- If applications don't launch, check that you're on macOS and the app paths are correct
