# Synology Download Station

Manage your Synology Download Station tasks directly from Raycast. This extension provides a seamless interface to view, manage, and create download tasks on your Synology NAS without leaving Raycast.

## Features

### 📋 List Tasks

- View all your Download Station tasks in a clean, organized list
- Filter tasks by status (All, Downloading, Finished, Paused, Waiting, Error)
- Real-time progress indicators with download speeds and ETAs
- Auto-refresh active downloads every 5 seconds
- Contextual actions: Pause, Resume, Delete tasks
- Copy task titles and download URLs to clipboard

### ➕ Add New Task

- Create download tasks from various URL formats
- Support for HTTP/HTTPS URLs, FTP URLs, and magnet links
- Built-in URL validation with helpful error messages
- Optional destination folder specification
- Form-based interface with proper validation

## Setup

### Prerequisites

- Synology NAS with Download Station package installed
- NAS accessible via network (local or remote with proper port forwarding)
- Valid Synology account with Download Station permissions

### Configuration

1. **Install the Extension**: Add the Synology Download Station extension to Raycast
2. **Configure Preferences**: When you first run the extension, you'll be prompted to set up:
   - **NAS URL**: Your Synology NAS URL with port (e.g., `https://your-nas.example.com:5001`)
     - Use `https://` for secure connections (recommended)
     - Include the port number (typically 5000 for HTTP, 5001 for HTTPS)
     - For local access: `https://192.168.1.100:5001`
     - For remote access: `https://your-nas.example.com:5001`

   - **Username**: Your Synology account username
   - **Password**: Your Synology account password

3. **Test Connection**: Run the "List Tasks" command to verify the connection works

## Troubleshooting

### Common Issues

**Connection Failed**

- Verify your NAS URL is correct and includes the port
- Check that Download Station is installed and running
- Ensure your network allows access to the specified port
- Try accessing the NAS web interface directly in a browser

**Authentication Errors**

- Verify your username and password are correct
- Ensure your account has permissions to use Download Station
- Check if 2-factor authentication is enabled (currently not supported)

**Tasks Not Updating**

- The extension auto-refreshes active downloads every 5 seconds
- Use `Cmd+R` in the task list to manually refresh
- Check your network connection stability

**URL Validation Errors**

- Ensure URLs are complete and properly formatted
- For magnet links, verify they start with `magnet:?xt=urn:`
- Some URLs may require authentication or cookies (not supported)

## Security Notes

- **Credentials**: Your NAS credentials are stored securely in Raycast's encrypted storage
- **Sessions**: The extension uses session-based authentication and handles re-authentication automatically
- **HTTPS**: Always use HTTPS for remote access to protect your credentials
- **No Data Collection**: This extension does not collect or transmit any personal data
- **Local Storage**: All data is stored locally on your device using Raycast's secure storage
- **Direct Connection**: The extension connects directly to your NAS without any intermediary servers
