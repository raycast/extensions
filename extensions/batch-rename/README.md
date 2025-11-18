# Batch Rename Images for SEO

A Raycast extension for batch renaming selected images with SEO-friendly filenames.

## Features

- **Works with Selected Images**: Select images in Finder and run the extension
- **SEO-Friendly Naming**: Automatically creates filenames like `keyword-image-000.jpg`
- **Safe Copying**: Creates a "Renamed" folder and copies (not moves) renamed images
- **Preview**: See how files will be renamed before applying changes
- **Image Filtering**: Automatically filters for image files only

## Usage

1. **Select Images in Finder**: Select the image files you want to rename (e.g., IMG123.jpg, IMG124.jpg)
2. **Open Raycast**: Press `Cmd+Space` and search for "Batch Rename Files"
3. **Enter Keyword**: Type a keyword in the search bar (e.g., "product-photo", "vacation-images")
4. **Preview**: Review the preview showing how files will be renamed
5. **Apply**: Press `Cmd+Enter` or click "Copy Renamed Files to Renamed Folder"

The extension will:
- Create a "Renamed" folder in the same directory as your selected images
- Copy all images with new SEO-friendly names (e.g., `product-photo-image-000.jpg`, `product-photo-image-001.jpg`)
- Open the "Renamed" folder in Finder

## Examples

### Example 1: Product Photos
- **Selected**: `IMG123.jpg`, `IMG124.jpg`, `IMG125.jpg`
- **Keyword**: `product-photo`
- **Result**: 
  - `product-photo-image-000.jpg`
  - `product-photo-image-001.jpg`
  - `product-photo-image-002.jpg`
- **Location**: Copied to `Renamed` folder

### Example 2: Vacation Images
- **Selected**: `DSC001.jpg`, `DSC002.jpg`, `DSC003.jpg`
- **Keyword**: `vacation-2024`
- **Result**:
  - `vacation-2024-image-000.jpg`
  - `vacation-2024-image-001.jpg`
  - `vacation-2024-image-002.jpg`
- **Location**: Copied to `Renamed` folder

## Supported Image Formats

- JPG/JPEG
- PNG
- GIF
- WebP
- BMP
- TIFF/TIF
- HEIC/HEIF
- SVG


## License

MIT

