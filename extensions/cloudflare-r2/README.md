# Cloudflare R2

A Raycast extension to manage Cloudflare R2 bucket files.

[中文文档](./README_CN.md)

## Features

- **Grid View**: Display all files in a 5-column grid layout with image previews
- **Upload Files**: Upload any local files to R2 bucket (⌘+U)
- **Upload from Clipboard**: Quick upload clipboard images to R2 and copy URL
- **Preview**: Open file in browser
- **Copy URL**: Copy public URL or presigned URL
- **Delete**: Delete files from bucket

## Configuration

You need to configure the following preferences:

| Field | Required | Description |
|-------|----------|-------------|
| Account ID | Yes | Cloudflare Account ID |
| Access Key ID | Yes | R2 API Token Access Key ID |
| Secret Access Key | Yes | R2 API Token Secret Access Key |
| Bucket Name | Yes | R2 bucket name |
| Public Domain | No | Public access domain for preview URLs |

### How to get R2 API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Overview page
3. Click "Manage R2 API Tokens"
4. Create a new API token with appropriate permissions
5. Copy the Access Key ID and Secret Access Key

## Commands

### Cloudflare R2 Manager

Browse and manage R2 bucket files in a grid view.

**Shortcuts:**
- `Enter` - Preview file
- `⌘+C` - Copy URL
- `⌘+U` - Upload files
- `⌘+Backspace` - Delete file

### Upload from Clipboard

Quick upload clipboard image to R2 and automatically copy the URL.

## Notes

- Files are renamed with UUID to prevent URL guessing
- Files are sorted by upload time (newest first)
- Clipboard upload supports image formats only: PNG, JPG, JPEG, GIF, WebP, SVG, ICO, BMP

## License

MIT
