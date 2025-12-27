# TinyS3

A [Raycast](https://raycast.com) extension for uploading images to S3-compatible storage with optional TinyPNG compression.

Supports both clipboard images and Finder selection.

## Features

- 📋 **Clipboard Upload** - Upload images directly from clipboard
- 📁 **Finder Upload** - Upload images selected in Finder (batch support)
- 🗜️ **TinyPNG Compression** - Optional image compression before upload
- 🔗 **Flexible URL Output** - Raw URL, Markdown, or BBCode format
- ☁️ **S3 Compatible** - Works with AWS S3, Cloudflare R2, MinIO, etc.

## Commands

| Command | Description |
|---------|-------------|
| **Upload Clipboard Image** | Upload clipboard image directly to S3 |
| **Compress & Upload Clipboard Image** | Compress with TinyPNG then upload |
| **Upload Selected Finder Images** | Upload images selected in Finder |
| **Compress & Upload Selected Finder Images** | Compress and upload Finder selection |

## Configuration

### Required Settings

| Setting | Description |
|---------|-------------|
| S3 Endpoint | S3-compatible service endpoint URL |
| S3 Region | Region (e.g., `us-east-1`, `auto`) |
| S3 Bucket | Bucket name |
| S3 Access Key ID | Access key ID |
| S3 Secret Access Key | Secret access key |

### Optional Settings

| Setting | Description | Default |
|---------|-------------|---------|
| S3 Key Prefix | File path prefix | `uploads/` |
| S3 URL Style | Path style or Virtual-hosted style | Path |
| Use Custom Public URL | Use custom URL instead of S3 endpoint | Off |
| Public URL Base | Custom base URL (e.g., CDN domain) | - |
| URL Output Format | raw / markdown / bbcode | raw |
| TinyPNG API Key | Required for compression commands | - |

## Usage

### Clipboard Commands
1. Copy an image (screenshot, from web, etc.)
2. Open Raycast and run the command
3. URL is automatically copied to clipboard

### Finder Commands
1. Select image(s) in Finder
2. Open Raycast and run the command
3. URLs are copied to clipboard (one per line for batch)

## URL Generation

**Default (Custom URL disabled):**
- Path Style: `https://endpoint/bucket/key`
- Virtual-hosted: `https://bucket.endpoint/key`

**Custom URL enabled:**
- `publicUrlBase/key`

## Get TinyPNG API Key

Get a free API key at [tinypng.com/developers](https://tinypng.com/developers)
(500 free compressions per month)

## License

MIT