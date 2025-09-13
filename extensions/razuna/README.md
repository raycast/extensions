# Razuna Raycast Extension

A Raycast extension for managing files in your Razuna workspace.

## Features

- **Browse Files**: Navigate through your workspace folders and files
- **Search Files**: Search for files across your workspace
- **Upload Files**: Upload single or multiple files to your workspace
- **File Management**: View file details, copy file names and IDs

## Setup

1. Install the extension from the Raycast Store
2. Open Raycast preferences and configure the extension:
   - **Server URL**: Your Razuna server (e.g., `https://app.razuna.com`, `https://app.razuna.eu`, or your custom domain)
   - **Access Token**: Your personal access token from Razuna profile settings

### Getting Your Access Token

1. Log in to your Razuna account
2. Go to your profile settings
3. Navigate to the Access Tokens section
4. Generate a new access token
5. Copy the token and paste it in the extension preferences

## Commands

### Browse Files
Navigate through your workspace folders and browse files with detailed information.

### Search Files
Search for files across your entire workspace or within specific workspaces.

### Upload File
Upload single or multiple files to your workspace with folder selection.

## API Endpoints Used

This extension uses the following Razuna API endpoints:
- `GET /api/v1/files/workspaces/user` - Get user workspaces
- `GET /api/v1/files/workspaces/folders` - Get workspace folders
- `GET /api/v1/files/folder/content` - Get folder content
- `POST /api/v1/files/search` - Search files
- `POST /api/v1/files/folder/upload` - Upload files

## Development

To run this extension locally:

1. Clone the repository
2. Navigate to the extension directory
3. Install dependencies: `npm install`
4. Run in development mode: `npm run dev`

## License

MIT License
