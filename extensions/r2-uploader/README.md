# Cloudflare R2 File Uploader

Upload any files to Cloudflare R2 storage service with optional AVIF conversion for images.

## Contact

For issues or questions regarding this extension, please contact:
- Email: `mazaoshe@hotmail.com`
- GitHub: [https://github.com/mazaoshe/Raycast-UploadImageR2](https://github.com/mazaoshe/Raycast-UploadImageR2)

## Supported File Types

This extension supports uploading all file types to Cloudflare R2. Here are the main categories:

### Image Formats
- JPEG/JPG, PNG, GIF, AVIF, SVG, ICO, TIFF, BMP, PSD

### Document Formats
- PDF, TXT, JSON, XML, CSV, RTF, Markdown (MD)

### Web Files
- HTML, CSS, JavaScript

### Office Documents
- Microsoft Office: DOC, DOCX, XLS, XLSX, PPT, PPTX

### Compressed Archives
- ZIP, TAR, GZ

### Media Files
- Audio: MP3
- Video: MP4, MOV, AVI, WMV, MKV

### Font Files
- WOFF, WOFF2, TTF, EOT, OTF

Note: Cloudflare R2 supports all file types as it's an object storage service that can store any binary data.

## Features

- Upload any files to Cloudflare R2 storage service
- Optionally convert images to AVIF format to reduce file size
- Support custom filename formats
- Automatically generate Markdown links and copy to clipboard
- After upload, the link is automatically copied to clipboard for easy pasting

## Requirements

### Required Configuration
- Cloudflare R2 Bucket
- Cloudflare API Access Keys

### Optional Dependencies (for image conversion)
If image conversion is enabled, you need to install the conversion tools:

For AVIF conversion:
```bash
brew install libavif
```


## Configuration Options

1. **R2 Bucket Name** - Your Cloudflare R2 bucket name
2. **R2 Access Key ID** - Your Cloudflare R2 access key ID
3. **R2 Secret Access Key** - Your Cloudflare R2 secret access key
4. **R2 Account ID** - Your Cloudflare account ID (the part before .r2.cloudflarestorage.com in your R2 URL)
5. **Custom Domain** (optional) - Custom domain for accessing files
6. **File Name Format** (optional) - Custom filename format
7. **Convert to AVIF** - Convert images to AVIF format before uploading
8. **AVIF Quality** - Quality setting for AVIF conversion (0-100, default: 80)
9. **AVIF Encoder Path** (optional) - Path to avifenc command (default: `/opt/homebrew/bin/avifenc`)
10. **Generate Markdown** - Generate Markdown formatted links instead of plain URLs

## Image Conversion

### AVIF Conversion
- Uses `avifenc` tool from libavif package
- Provides superior compression compared to JPEG
- Requires external tool installation
- Quality setting: 0-100 (default: 80)

## Custom Filename Format

Supported variables:
- `{name}` - Original filename (without extension)
- `{ext}` - File extension (without dot)
- `{year}` - Four-digit year
- `{month}` - Two-digit month (01-12)
- `{day}` - Two-digit day (01-31)
- `{hours}` - Two-digit hour (00-23)
- `{minutes}` - Two-digit minute (00-59)
- `{seconds}` - Two-digit second (00-59)

Example formats:
- `{name}_{year}{month}{day}_{hours}{minutes}{seconds}.{ext}` → Result: `document_20250815_143022.pdf`
- `file_{year}-{month}-{day}.{ext}` → Result: `file_2025-08-15.txt`

## Usage Workflow

### Initial Setup
1. Install the extension from Raycast Store
2. Open Raycast Preferences > Extensions > Cloudflare R2 File Uploader
3. Configure your Cloudflare R2 credentials:
   - R2 Bucket Name
   - R2 Access Key ID
   - R2 Secret Access Key
   - R2 Account ID (the part before .r2.cloudflarestorage.com in your R2 URL)
4. (Optional) Install conversion tools:
   - For AVIF: `brew install libavif`
5. (Optional) Configure additional settings:
   - Custom Domain
   - File Name Format
   - Convert to AVIF
   - Quality settings for conversions
   - Encoder paths (if different from default)
   - Generate Markdown (disabled by default)

### Daily Usage
1. Select any file in Finder
2. Open Raycast (Cmd + Space) and search for "Upload File to R2"
3. Press Enter to execute the command
4. The extension will:
   - (If enabled and file is an image) Convert the image to AVIF format
   - Upload the file to your R2 bucket
   - Generate a link (Markdown or plain URL)
   - Copy the link to your clipboard
5. Paste the link anywhere you need it

## Troubleshooting

### Conversion Tool Not Found
If you encounter a "conversion tool not found" error:
1. Ensure the required tool is installed:
   - For AVIF: `brew install libavif`
2. Check that the encoder path setting points to the correct command
3. Run `which avifenc` in terminal to find the correct path

### Upload Failed
If the upload fails:
1. Check your Cloudflare R2 credentials in extension preferences
2. Verify your internet connection
3. Check that your R2 bucket exists and is accessible
4. Review the Raycast console logs for detailed error information