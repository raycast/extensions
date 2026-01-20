# GitCDN

View images from GitHub repositories using CDN URLs. Browse and access images stored in any public GitHub repository with fast CDN delivery.

## Features

- 🔍 **Browse Images**: Search and browse all images in a GitHub repository
- 🚀 **CDN URLs**: Generate jsDelivr CDN URLs for fast image delivery
- 📋 **Copy URLs**: Quickly copy CDN or raw GitHub URLs
- 🔎 **Image Preview**: View images with details and metadata
- 📁 **Recursive Search**: Automatically finds images in subdirectories
- ➕ **Upload Images**: Upload images from Finder to your repository (requires GitHub token)
- 🗑️ **Delete Images**: Delete images directly from the repository (requires GitHub token)

## Configuration

Set your default repository in the extension preferences:
1. Open Raycast Settings
2. Go to Extensions → GitCDN
3. Enter your default repository URL in the "Default Repository" field
   - Format: `owner/repo` (e.g., `vercel/next.js`)
   - Or full URL: `https://github.com/owner/repo`

### GitHub Token (Recommended)

To avoid rate limits, add a GitHub personal access token:
1. Create a token at [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Select "Generate new token (classic)"
3. No scopes needed for public repos (or select `public_repo` for private repos)
4. Copy the token and paste it in the "GitHub Token" field in preferences

**Benefits:**
- Increases rate limit from **60 requests/hour** to **5,000 requests/hour**
- Prevents rate limit errors when browsing repositories
- Required for accessing private repositories
- **Required for uploading and deleting images** (needs `repo` scope for write access)

The extension will automatically load images from your default repository when opened. Images are cached for 5 minutes to reduce API calls.

## Commands

### View Images

Browse and view images from your GitHub repository:

1. Open the "View Images" command
2. If you've configured a default repository, images will load automatically
3. Browse the grid of images found in the repository
4. Use actions to:
   - Open images in browser
   - Copy CDN URL (jsDelivr)
   - Copy raw GitHub URL
   - View image details
   - Delete images (⌘Delete) - requires GitHub token

### Upload Image Selected in Finder

Upload images from Finder to your GitHub repository:

1. Select image files in Finder
2. Open the "Upload Image Selected in Finder" command (separate command in Raycast)
3. Images will be uploaded to the root of your repository
4. You'll see a success notification when complete

**Note**: Uploading requires a GitHub token with write permissions. The token needs the `repo` scope for private repositories.

### Deleting Images

1. Open "View Images" command
2. Browse images in the grid
3. Select an image
4. Press **⌘Delete** or use the "Delete Image" action
5. Image will be removed from the repository

**Note**: Deleting requires a GitHub token with write permissions.

## Supported Image Formats

- PNG
- JPG/JPEG
- GIF
- WebP
- SVG
- ICO
- BMP

## CDN Provider

This extension uses [jsDelivr](https://www.jsdelivr.com/) CDN for fast and reliable image delivery.

## Requirements

- Public GitHub repository (private repos require GitHub token with `repo` scope)
- Internet connection
- Optional: GitHub personal access token to increase rate limits

## Rate Limits

Without a GitHub token, you're limited to **60 API requests per hour**. With a token, this increases to **5,000 requests per hour**. The extension caches results for 5 minutes to minimize API calls. Use the refresh action (⌘R) to manually update the cache.
