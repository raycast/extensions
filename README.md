# EXR Converter

Convert, resize, and compress images (EXR, JPG, PNG, TIFF, TX) using OpenImageIO.

## Features

- **Multiple Format Support**: Convert between EXR, JPG, PNG, TIFF, and TX (Arnold) formats
- **Compression Options**: Choose from various compression algorithms for each format
- **Resize Images**: Resize images with multiple modes (width, height, percentage, longest edge)
- **Batch Processing**: Convert multiple images at once from Finder selection
- **Quality Control**: Adjustable compression levels for optimal file size vs quality

## Requirements

This extension requires **OpenImageIO** to be installed on your system. OpenImageIO provides the `oiiotool` command-line utility that powers all image conversions.

### Installation

Install OpenImageIO using Homebrew:

```bash
brew install openimageio
```

After installation, restart Raycast and the extension will automatically detect the installation.

## Usage

1. **Select Images**: Select one or more images in Finder
2. **Run Command**: Open Raycast and run the "Convert Image" command
3. **Configure Options**:
   - Choose output format (EXR, JPG, PNG, TIFF, TX)
   - Select compression method (format-specific options available)
   - Optionally resize the image
   - Choose output location
4. **Convert**: Press `Cmd+Enter` to start the conversion

## Supported Formats

### EXR
- Compression: DWAA, DWAB, Zip, Zips, RLE, PIZ, PXR24, B44, B44A, None

### JPG
- Quality levels: 100 (Best), 90 (High), 80 (Good), 50 (Medium), 20 (Low)

### PNG
- Compression: Zip, None

### TIFF
- Compression: LZW, Zip, None, Packbits

### TX (Arnold)
- Specialized format for Arnold renderer texture files

## Resize Options

- **None**: Keep original dimensions
- **Width**: Resize to specific width (maintains aspect ratio)
- **Height**: Resize to specific height (maintains aspect ratio)
- **Percentage**: Scale by percentage (e.g., 50% = half size)
- **Longest Edge**: Resize longest edge to specific size (maintains aspect ratio)

## Output Options

- **Same Folder**: Save converted images in the same folder as originals
- **Custom Folder**: Choose a specific output directory
- **Replace Original**: Overwrite the original file (use with caution)

## Notes

- The extension automatically detects if OpenImageIO is installed
- If OpenImageIO is not found, you'll see installation instructions
- All conversions preserve image quality and metadata where possible
- Large images may take some time to process

