# Nest Camera Raycast Extension

A Raycast extension that provides quick access to your Google Nest camera feeds through direct RTSP streaming. View your cameras instantly with FFplay for low-latency, high-quality playback. This extension is specifically designed for the Nest Cam Indoor (1st gen) model.

## Camera Compatibility

This extension is built specifically for:
- **Nest Cam Indoor (1st generation)**
  - Only supports RTSP streaming
  - Does not support newer protocols like WebRTC
  - Requires FFplay for direct RTSP playback

Other Nest camera models are not currently supported as they use different streaming protocols.

## Features

- 🎥 Instant access to Nest camera feeds through direct RTSP streaming
- 🚀 Low-latency playback with optimized FFplay parameters
- 🔍 Quick search and filter through your cameras
- ⭐️ Favorite cameras for hotkey access
- 🎮 One-click stream launch
- 🔐 Secure OAuth2 authentication with PKCE
- 🧹 Automatic process management and cleanup
- ⚡️ Quick Access to your preferred camera

## Prerequisites

1. Nest Cam Indoor (1st generation)
2. macOS 12.0 or later
3. Raycast 1.50.0 or later
4. **FFmpeg/FFplay installed** - This is **required** for video playback
5. Google Device Access registration ($5 one-time fee)
6. Google Cloud OAuth2 client credentials

### Required Software

The extension relies on the following software being installed on your Mac:
- **FFmpeg/FFplay**: Used for RTSP video streaming
- **AppleScript**: Used for window management and loading dialogs (built into macOS)
- **Bash**: Used for scripting (built into macOS)

### Installing FFmpeg

FFmpeg is required for this extension to work. You can install it using Homebrew:

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install FFmpeg
brew install ffmpeg
```

Alternatively, you can download FFmpeg from the [official website](https://ffmpeg.org/download.html).

If you encounter any issues with the extension, please ensure these prerequisites are properly installed.

## Installation

1. Install FFmpeg/FFplay (if not already installed):
   ```bash
   brew install ffmpeg
   ```

2. Install the extension from Raycast Store

3. Set up Google Device Access:
   - Visit [Google Device Access Console](https://console.nest.google.com/device-access)
   - Complete registration ($5 one-time fee)
   - Create a project and note the Project ID

4. Configure OAuth2:
   - Visit [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable the Smart Device Management API
   - Create OAuth2 credentials
   - Add authorized redirect URIs:
     ```
     https://oauth.raycast.com/google
     ```

5. First Run:
   - Launch the extension in Raycast
   - Follow the OAuth2 authentication flow
   - Grant necessary permissions

## Usage

1. Open Raycast with your configured hotkey
2. Search for "Nest Camera"
3. Select a camera to view:
   - Enter to open the stream with FFplay
   - ⌥+Enter to set as favorite

### Setting Up Quick Access

1. Open the Nest Camera extension
2. Find the camera you want to set as Quick Access
3. Press ⌘+S or select "Set as Quick Access" from the action menu
4. The camera will now be marked with a star icon

### Using Quick Access

1. Open Raycast with your configured hotkey
2. Search for "Nest Quick Access"
3. Press Enter to immediately open your preferred camera
4. You can also add this command to your Raycast favorites for even faster access

### Loading Time

When you launch a camera stream:
1. A loading dialog will appear indicating that the stream is being prepared
2. This dialog will remain visible for up to 20 seconds while the stream initializes
3. Once the stream is ready, the dialog will automatically close and the video will be visible
4. If the stream fails to load, an error notification will appear

The loading time varies depending on your network connection and the camera's response time. Typically, it takes 10-20 seconds for the stream to initialize and appear.

## Troubleshooting

If you encounter issues with the extension, try these steps:

1. **Check FFmpeg Installation**: Ensure FFmpeg is properly installed via `brew install ffmpeg`
2. **Verify Google Credentials**: Make sure your Google OAuth credentials are correctly configured
3. **Check Network Connection**: Ensure your Nest camera is online and accessible
4. **Review Logs**: Check the logs for detailed error information:
   - Extension logs: In Raycast, press `⌘` + `,` to open preferences, go to Extensions, select Nest Camera, and click "Show Logs"
   - Player logs: Check `~/Library/Logs/NestCameraViewer/` for detailed player logs
5. **Restart Raycast**: Sometimes simply restarting Raycast can resolve issues

### Common Issues

- **No video appears**: This could be due to network issues, incorrect RTSP URL, or FFmpeg configuration problems. Check the logs for specific error messages.
- **FFplay not found**: If you see an error about FFplay not being found, make sure you have installed FFmpeg using `brew install ffmpeg`.
- **Loading dialog doesn't close**: If the loading dialog remains on screen, the stream may have failed to start. Check the logs for error messages.

## Known Limitations

- Only supports Nest Cam Indoor (1st generation)
- RTSP streaming only (WebRTC not supported)
- One camera stream at a time
- FFplay required for playback
- macOS only
- FFplay window appears in the dock when viewing a camera

## FFplay Window Behavior

When viewing a camera stream, you will see an FFplay window in your dock. This is the standard behavior of FFplay and is expected. Some notes about this behavior:

- The FFplay window will show in your dock while the stream is active
- When you're done viewing the stream, you can close the FFplay window using the standard window controls or by pressing **Command+Q**
- The extension will automatically clean up any FFplay processes when you close the stream or quit Raycast
- If you experience any issues with FFplay windows not closing properly, you can manually terminate FFplay processes using Activity Monitor or by running `pkill -f ffplay` in Terminal

While we've optimized the FFplay parameters for the best viewing experience, the dock icon behavior is a limitation of how FFplay works on macOS and cannot be completely eliminated without using a custom video player application.

## Development

1. Clone the repository:
   ```bash
   git clone https://github.com/chadwalters/nestcamera.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development:
   ```bash
   npm run dev
   ```

4. Build the extension:
   ```bash
   npm run build
   ```

### Logging

The extension includes comprehensive logging to help with debugging:

1. **Player Script Logs**: The `nest-player.sh` script logs detailed information about its execution to `~/Library/Logs/NestCameraViewer/`. These logs include:
   - FFplay process information
   - Window positioning details
   - Error messages and exit codes
   - AppleScript execution results

2. **Extension Logs**: Raycast extension logs can be accessed through Raycast preferences.

### Architecture

The extension is built with a focus on reliability and user experience:

1. **Process Management**: The `ProcessManager` service handles starting and stopping FFplay processes
2. **RTSP Stream Service**: Manages the connection to Nest cameras and retrieves RTSP URLs
3. **OAuth Management**: Handles authentication with Google's Device Access API
4. **UI Components**: React components for camera selection and viewing

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [Raycast](https://raycast.com)
- [Google Nest](https://store.google.com/category/connected_home)
- [FFmpeg/FFplay](https://ffmpeg.org)
- All contributors and users