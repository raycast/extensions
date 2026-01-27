# GitCDN

View files from GitHub repositories using CDN URLs. Browse and access files stored in any public GitHub repository with fast CDN delivery.

## Features

- 🔍 **Browse Files**: Search and browse all files in a GitHub repository
- 🚀 **CDN URLs**: Generate jsDelivr CDN URLs for fast file delivery
- 📋 **Copy URLs**: Quickly copy CDN or raw GitHub URLs
- 🔎 **File Preview**: View files with details and metadata
- 📁 **Recursive Search**: Automatically finds files in subdirectories
- ➕ **Upload Files**: Upload files from Finder to your repository (requires GitHub token)
- 🗑️ **Delete Files**: Delete files directly from the repository (requires GitHub token)

## Configuration

Set your default repository in the extension preferences:
1. Open Raycast Settings
2. Go to Extensions → GitCDN
3. Enter your default repository URL in the "Default Repository" field
   - Format: `owner/repo` (e.g., `vercel/next.js`)
   - Or full URL: `https://github.com/owner/repo`

### GitHub Token (Recommended)

To avoid rate limits, add a GitHub personal access token:
1. Create a token at [https://github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens)
2. Select "Generate new token (classic)"
3. No scopes needed for public repos (or select `public_repo` for private repos)
4. Copy the token and paste it in the "GitHub Token" field in preferences

**Benefits:**
- Increases rate limit from **60 requests/hour** to **5,000 requests/hour**
- Prevents rate limit errors when browsing repositories
- Required for accessing private repositories
- **Required for uploading and deleting files** (needs `repo` scope for write access)

The extension will automatically load files from your default repository when opened. Files are cached for 5 minutes to reduce API calls.

## Commands

### View Files

Browse and view files from your GitHub repository:

1. Open the "View Files" command
2. If you've configured a default repository, files will load automatically
3. Browse the grid of files found in the repository
4. Use actions to:
   - Open files in browser
   - Copy CDN URL (jsDelivr)
   - Copy raw GitHub URL
   - View file details
   - Delete files (⌘Delete) - requires GitHub token

### Upload File Selected in Finder

Upload files from Finder to your GitHub repository:

1. Select files in Finder
2. Open the "Upload File Selected in Finder" command (separate command in Raycast)
3. Files will be uploaded to the root of your repository
4. You'll see a success notification when complete

**Note**: Uploading requires a GitHub token with write permissions. The token needs the `repo` scope for private repositories.

### Deleting Files

1. Open "View Files" command
2. Browse files in the grid
3. Select a file
4. Press **⌘Delete** or use the "Delete File" action
5. File will be removed from the repository

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

This extension uses [jsDelivr](https://www.jsdelivr.com/) CDN for fast and reliable file delivery.

## Requirements

- Public GitHub repository (private repos require GitHub token with `repo` scope)
- Internet connection
- Optional: GitHub personal access token to increase rate limits

## Rate Limits

Without a GitHub token, you're limited to **60 API requests per hour**. With a token, this increases to **5,000 requests per hour**. The extension caches results for 5 minutes to minimize API calls. Use the refresh action (⌘R) to manually update the cache.
