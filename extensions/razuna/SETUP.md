# Razuna Raycast Extension Setup Guide

## Installation Requirements

1. **Raycast**: Download and install Raycast from [raycast.com](https://raycast.com)
2. **Node.js**: Version 18+ required
3. **Raycast CLI**: Install using `npm install -g @raycast/api`

## Development Setup

1. Navigate to the extension directory:
   ```bash
   cd /Users/nitai/repos/helpmonks/apps/razuna_raycast
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npx ray develop
   ```

## Configuration

Before using the extension, configure these settings in Raycast preferences:

### Server URL
Enter your Razuna server URL:
- `app.razuna.com` (US server)
- `app.razuna.eu` (EU server)
- Your custom domain (if self-hosted)

### Access Token
1. Log into your Razuna account
2. Go to Profile → Settings → API Access
3. Generate a new access token
4. Copy the token into the extension preferences

## Available Commands

### 1. Browse Files
- Navigate through workspace folders
- View file details and metadata
- Copy file names and IDs
- **Usage**: `CMD + Space → "Browse Files"`

### 2. Search Files
- Search across all workspaces or specific workspace
- Quick search from the main interface
- Advanced search with workspace filtering
- **Usage**: `CMD + Space → "Search Files"`

### 3. Upload File
- Select workspace and folder destination
- Upload single or multiple files
- Real-time upload progress
- **Usage**: `CMD + Space → "Upload File"`

## API Endpoints Used

The extension integrates with these Razuna API endpoints:

```
GET  /api/v1/files/workspaces/user        # Get user workspaces
GET  /api/v1/files/workspaces/folders     # Get workspace folders
GET  /api/v1/files/folder/content         # Get folder content
POST /api/v1/files/search                 # Search files
POST /api/v1/files/folder/upload          # Upload files
```

## Authentication

Uses the same access token system as the Razuna Chrome extension:
- Header: `x-access-token: YOUR_TOKEN`
- Token scope: Full workspace access
- Tokens don't expire but can be revoked

## Error Handling

Common issues and solutions:

### "Access token not found"
- Check token is entered correctly in preferences
- Verify token is active in Razuna settings

### "API request failed: 401"
- Token may be expired or revoked
- Generate a new token in Razuna

### "Failed to load workspaces"
- Check server URL is correct
- Verify network connectivity
- Ensure Razuna server is accessible

## File Structure

```
src/
├── api.ts              # Razuna API client
├── types.ts            # TypeScript interfaces
├── browse-files.tsx    # File browser command
├── search-files.tsx    # Search command
├── upload-file.tsx     # Upload command
assets/
├── razuna-icon.png     # Extension icon
package.json            # Extension manifest
README.md              # Documentation
```

## Development Notes

- Built with TypeScript and React
- Uses Raycast's built-in UI components
- Follows Raycast extension patterns
- Error handling with toast notifications
- Proper loading states and user feedback

## Troubleshooting

### Build Issues
```bash
# Install Raycast CLI if missing
npm install -g @raycast/api

# Clean and reinstall
rm -rf node_modules && npm install
```

### TypeScript Errors
- All interfaces are properly typed
- API responses match expected formats
- Error boundaries handle API failures

### Upload Issues
- Check file size limits (consult Razuna docs)
- Verify folder permissions
- Ensure proper network connectivity
