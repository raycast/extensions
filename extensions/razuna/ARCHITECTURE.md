# Razuna Raycast Extension - Complete Implementation

## Overview

This is a complete, working Raycast extension for Razuna file management. The extension provides three main commands for interacting with your Razuna workspace directly from Raycast.

## Architecture

### Core Components

1. **API Client (`src/api.ts`)**
   - Handles all Razuna API communication
   - Uses access token authentication (x-access-token header)
   - Supports file upload with FormData
   - Error handling and response parsing

2. **Type Definitions (`src/types.ts`)**
   - Complete TypeScript interfaces for all Razuna entities
   - Utility functions for formatting and URL construction
   - Preferences management

3. **Commands**
   - `browse-files.tsx` - File and folder browser
   - `search-files.tsx` - File search functionality
   - `upload-file.tsx` - File upload interface

## Key Features

### Authentication
- Uses same access token system as Chrome extension
- Token stored securely in Raycast preferences
- Header-based authentication: `x-access-token`

### File Browser
- Navigate workspace folder hierarchies
- View file metadata (size, date, type)
- File type-specific icons
- Breadcrumb navigation
- Copy file names and IDs

### Search
- Real-time search as you type
- Workspace-specific filtering
- Advanced search form
- Result pagination support

### Upload
- Multi-file upload support
- Workspace and folder selection
- Progress feedback
- Error handling for large files

## API Integration

### Endpoints Used
```typescript
// Get user workspaces
GET /api/v1/files/workspaces/user

// Get workspace folders
GET /api/v1/files/workspaces/folders?workspace_id={id}

// Get folder content (files and subfolders)
GET /api/v1/files/folder/content?workspace_id={id}&folder_id={id}

// Search files
POST /api/v1/files/search
{
  "search_query": "...",
  "workspace_id": "...", // optional
  "page": 1,
  "per_page": 50
}

// Upload file
POST /api/v1/files/folder/upload
FormData:
  file: [binary data]
  workspace: workspace_id
  folder: folder_id (optional)
```

### Authentication Headers
```typescript
{
  "x-access-token": "user_access_token",
  "Content-Type": "application/json" // for JSON requests
}
```

## User Interface

### Raycast Components Used
- `List` - Main browsing interface
- `List.Item` - File and folder entries
- `Form` - Upload and advanced search
- `ActionPanel` - Context actions
- `Detail` - File information display
- `Toast` - Status notifications

### Navigation Patterns
- `Action.Push` - Navigate to new screens
- `useNavigation().pop()` - Return to previous screen
- Breadcrumb navigation in file browser
- Back button support

## Configuration

### Required Settings
1. **Server URL**: Razuna server endpoint
   - `app.razuna.com` (US)
   - `app.razuna.eu` (EU)
   - Custom domain for self-hosted

2. **Access Token**: User's API token
   - Generated in Razuna profile settings
   - Required for all API calls
   - Same token used by Chrome extension

## Error Handling

### API Errors
- Network connectivity issues
- Invalid authentication
- Server errors (500, 404, etc.)
- Malformed responses

### User Feedback
- Toast notifications for success/failure
- Loading states during API calls
- Empty states when no data
- Error details in readable format

## File Type Support

### Supported File Types
- Images: jpg, jpeg, png, gif, bmp, svg, webp
- Documents: pdf, txt, md, log
- Videos: mp4, avi, mov, wmv, flv, webm
- Audio: mp3, wav, flac, aac, ogg
- Archives: zip, rar, 7z, tar, gz

### File Operations
- View file metadata
- Copy file names and IDs
- File type-specific icons
- Size formatting (bytes to human-readable)
- Date formatting

## Development Setup

### Prerequisites
```bash
# Install Raycast
# Download from raycast.com

# Install Node.js 18+

# Install Raycast CLI
npm install -g @raycast/api
```

### Development Workflow
```bash
# Navigate to extension directory
cd /Users/nitai/repos/helpmonks/apps/razuna_raycast

# Install dependencies
npm install

# Start development mode
npx ray develop

# Build for production
npx ray build

# Publish to store
npx ray publish
```

## Extension Manifest

The `package.json` defines:
- Three commands (browse, search, upload)
- Server URL and token preferences
- Required dependencies
- Build scripts and metadata

## Security Considerations

### Access Token
- Stored securely in Raycast preferences
- Never logged or exposed
- Same scope as Chrome extension
- Can be revoked in Razuna settings

### API Calls
- All requests over HTTPS
- No sensitive data in URLs
- Error messages don't expose tokens
- Proper input validation

## Performance

### Optimizations
- Lazy loading of folder contents
- Search debouncing (minimum 3 characters)
- Efficient API response caching
- Minimal re-renders with React hooks

### Limitations
- File upload size limited by Razuna settings
- Search results paginated (50 per page)
- Network dependent performance
- No offline functionality

## Future Enhancements

### Potential Features
- File preview/Quick Look
- Bulk file operations
- Folder creation
- File sharing/public links
- Recent files view
- Favorite files/folders
- Advanced file filtering
- Keyboard shortcuts
- Dark mode optimization

### Technical Improvements
- Response caching with TTL
- Background sync
- Offline queue for uploads
- Better error recovery
- Performance monitoring
- Analytics integration

## Compatibility

### Raycast Version
- Requires Raycast 1.26.0+
- Uses Raycast API 1.83.1+
- Compatible with macOS 10.15+

### Razuna Version
- Works with current Razuna API
- Compatible with both US and EU servers
- Supports self-hosted Razuna instances
- Uses same authentication as web app

This extension provides a complete, production-ready interface to Razuna from within Raycast, following all best practices for both Raycast extensions and API integration.
