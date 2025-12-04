# EXR Converter

**Professional image conversion tool for VFX, motion graphics, and game development.**

EXR Converter brings the power of **OpenImageIO** directly to Raycast. Batch convert, resize, and compress images with industry-standard formats and controls.

## ✨ Features

-   **Multi-Format Support**: Convert between **EXR**, **JPG**, **PNG**, **TIFF**, and **TX** (Arnold).
-   **Advanced Compression**: Full control over compression methods (DWAA, DWAB, Zip, RLE, etc.) and quality levels.
-   **Smart Resizing**: Resize by percentage, specific width/height, or fit within a bounding box using high-quality filters (Lanczos3, Cubic, etc.).
-   **Batch Processing**: Select multiple images in Finder and convert them all at once.
-   **VFX Ready**: Specifically designed for high-end workflows involving EXR and TX textures.

## �️ Prerequisites

This extension relies on external tools to perform image conversions. You must install them before using the extension.

1.  **Homebrew**: If you don't have Homebrew installed, visit [brew.sh](https://brew.sh).
2.  **OpenImageIO & ExifTool**: Run the following command in your terminal:
    ```bash
    brew install openimageio exiftool
    ```

## 🚀 Getting Started

1.  **Select Images**: Select one or more images in Finder.
3.  **Run Command**: Open Raycast and run **Convert Image**.
4.  **Configure**: Choose your desired format, compression, and resize options.

## 📦 Supported Formats

| Format | Compressions |
| :--- | :--- |
| **EXR** | DWAA, DWAB, Zip, RLE, PIZ, PXR24, B44, B44A |
| **JPG** | Quality 20-100 |
| **PNG** | Zip, None |
| **TIFF** | LZW, Zip, Packbits, None |
| **TX** | Zip, LZW, None |
| **RAW** | *Input only* (CR3, CR2, DNG, NEF, ARW, RAF, ORF, RW2) |

## 🔧 Requirements

-   **OpenImageIO**: Must be installed via Homebrew (`brew install openimageio`).
-   **ExifTool**: Required for RAW image support (`brew install exiftool`).
-   **macOS**: Silicon or Intel.
