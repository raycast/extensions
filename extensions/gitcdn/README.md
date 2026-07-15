# GitCDN

View files from GitHub repositories using CDN URLs. Browse and access files stored in any public GitHub repository with fast CDN delivery.

## Features

- **Browse Files**: Search and browse all files in a GitHub repository
- **CDN URLs**: Generate jsDelivr CDN URLs for fast file delivery
- **Copy URLs**: Quickly copy CDN or raw GitHub URLs
- **File Preview**: View files with details and metadata
- **Recursive Search**: Automatically finds files in subdirectories
- **Upload Files**: Upload files from Finder to your repository (requires GitHub token)
- **Delete Files**: Delete files directly from the repository (requires GitHub token)

## Configuration

Both preferences are **required** to use this extension. You'll be prompted to configure them when you first open the extension.

### Required Preferences

1. **Default Repository** (Required)
   - Format: `owner/repo` (e.g., `vercel/next.js`)
   - Or full URL: `https://github.com/owner/repo`
   - The repository to browse and manage files from

2. **GitHub Token** (Required)
   - Create a token at [https://github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens)
   - **Classic tokens**: Use `repo` scope for full access (read, upload, delete)
   - **Fine-grained tokens**: Use `Contents: Read` (read) and `Contents: Write` (upload/delete)
   - Paste the token in the "GitHub Token" field in preferences

**Benefits:**
- Increases rate limit from **60 requests/hour** to **5,000 requests/hour**
- Prevents rate limit errors when browsing repositories
- Required for accessing private repositories
- **Required for uploading and deleting files**

The extension will automatically load files from your default repository when opened. Files are cached for 5 minutes to reduce API calls.

## Commands

### View Files

Browse and view files from your GitHub repository:

1. Open the "View Files" command
2. If you've configured a default repository, files will load automatically
3. Browse the grid of files found in the repository
4. Use actions to:
   - Open files in browser (opens GitHub blob URL)
   - Copy CDN URL (jsDelivr)
   - Copy raw GitHub URL
   - Copy GitHub blob URL
   - View file details
   - Delete files (⌘Delete)

### Upload File Selected in Finder

Upload files from Finder to your GitHub repository:

1. Select files in Finder
2. Open the "Upload File Selected in Finder" command (separate command in Raycast)
3. Files will be uploaded to the root of your repository
4. You'll see a success notification when complete

**Note**: Uploading requires a GitHub token with write permissions (`repo` scope for classic tokens, or `Contents: Write` for fine-grained tokens).

### Deleting Files

1. Open "View Files" command
2. Browse files in the grid
3. Select a file
4. Press **⌘Delete** or use the "Delete File" action
5. File will be removed from the repository

**Note**: Deleting requires a GitHub token with write permissions (`repo` scope for classic tokens, or `Contents: Write` for fine-grained tokens).

## Supported File Types

This extension supports **all file types**. Image files (PNG, JPG, JPEG, GIF, WebP, SVG, ICO, BMP) are displayed with previews in the grid, while other file types are shown with document icons.

## CDN Provider

This extension uses [jsDelivr](https://www.jsdelivr.com/) CDN for fast and reliable file delivery.

## Requirements

- GitHub repository (public or private)
- GitHub personal access token (required)
- Internet connection