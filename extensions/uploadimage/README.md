# Image to R2 Uploader

Upload images to Cloudflare R2 storage service with optional AVIF conversion to reduce file size.

## Contact

For issues or questions regarding this extension, please contact:
- Email: `mazaoshe@hotmail.com`
- GitHub: [https://github.com/mazaoshe/Raycast-UploadImageR2](https://github.com/mazaoshe/Raycast-UploadImageR2)

## Features

- Upload images to Cloudflare R2 storage service
- Optionally convert images to AVIF format to reduce file size
- Support custom filename formats
- Automatically generate Markdown image links and copy to clipboard
- After upload, the Markdown link is automatically copied to clipboard for easy pasting


## Requirements

### Required Configuration
- Cloudflare R2 Bucket
- Cloudflare API Access Keys

### Optional Dependencies (for AVIF conversion)
If AVIF conversion is enabled, you need to install the libavif tool:

```bash
brew install libavif
```

## Configuration Options

1. **R2 Bucket Name** - Your Cloudflare R2 bucket name
2. **R2 Access Key ID** - Your Cloudflare R2 access key ID
3. **R2 Secret Access Key** - Your Cloudflare R2 secret access key
4. **R2 Account ID** - Your Cloudflare account ID
5. **Custom Domain** (optional) - Custom domain for accessing files
6. **File Name Format** (optional) - Custom filename format
7. **Convert to AVIF** - Convert images to AVIF format before uploading
8. **AVIF Encoder Path** (optional) - Path to avifenc command (default: `/opt/homebrew/bin/avifenc`)

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
- `{name}_{year}{month}{day}_{hours}{minutes}{seconds}` → Result: `screenshot_20250815_143022.png`
- `image_{year}-{month}-{day}` → Result: `image_2025-08-15.png`

## Usage Workflow

### Initial Setup
1. Install the extension from Raycast Store
2. Open Raycast Preferences > Extensions > Image to R2 Uploader
3. Configure your Cloudflare R2 credentials:
   - R2 Bucket Name
   - R2 Access Key ID
   - R2 Secret Access Key
   - R2 Account ID
4. (Optional) Install libavif for AVIF conversion: `brew install libavif`
5. (Optional) Configure additional settings:
   - Custom Domain
   - File Name Format
   - Convert to AVIF (enabled by default)
   - AVIF Encoder Path (if different from default)

### Daily Usage
1. Select an image file in Finder
2. Open Raycast (Cmd + Space) and search for "Upload Image to R2"
3. Press Enter to execute the command
4. The extension will:
   - (If enabled) Convert the image to AVIF format
   - Upload the image to your R2 bucket
   - Generate a Markdown image link
   - Copy the link to your clipboard
5. Paste the Markdown link anywhere you need it

## Troubleshooting

### AVIF Conversion Tool Not Found
If you encounter the "AVIF conversion tool not found" error:
1. Ensure libavif is installed: `brew install libavif`
2. Check that the "AVIF Encoder Path" setting points to the correct avifenc command
3. Run `which avifenc` in terminal to find the correct path

### Upload Failed
If the upload fails:
1. Check your Cloudflare R2 credentials in extension preferences
2. Verify your internet connection
3. Check that your R2 bucket exists and is accessible
4. Review the Raycast console logs for detailed error information