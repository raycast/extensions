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
4. **FFmpeg/FFplay installed** (`brew install ffmpeg`) - This is required for video playback
5. Google Device Access registration ($5 one-time fee)
6. Google Cloud OAuth2 client credentials

The extension relies on the following software being installed on your Mac:
- **FFmpeg/FFplay**: Used for RTSP video streaming (install with `brew install ffmpeg`)
- **AppleScript**: Used for window management and loading dialogs (built into macOS)
- **Bash**: Used for scripting (built into macOS)

If you encounter any issues with the extension, please ensure these prerequisites are properly installed.

## Installation

1. Install FFmpeg/FFplay:
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
   - ⌘+Enter for fullscreen mode
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
- **Multiple dock icons**: If you see multiple dock icons, try quitting all instances of the Nest Camera Viewer app and restarting Raycast.
- **Loading dialog doesn't close**: If the loading dialog remains on screen, the stream may have failed to start. Check the logs for error messages.

## Known Limitations

- Only supports Nest Cam Indoor (1st generation)
- RTSP streaming only (WebRTC not supported)
- One camera stream at a time
- FFplay required for playback
- macOS only
- Two dock icons appear when viewing a camera (see note below)

## Dock Icon Behavior

When viewing a camera stream, you will notice two icons in your dock:
1. The **Nest Camera Viewer** app icon
2. The **FFplay** icon (used for video playback)

This is expected behavior due to how FFplay integrates with macOS. When you're done viewing the stream, you can press **Command+Q** to close both applications at once. The extension ensures that both icons are removed from your dock when you quit the stream.

While we've made extensive efforts to hide the FFplay icon, technical limitations with how FFplay interacts with macOS make this challenging. We've optimized for functional behavior (proper quitting with Command+Q) over visual appearance.

## Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nest-raycast-extension.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Creating/Updating the Nest Camera Viewer App:
   - The extension includes a pre-built Platypus app in the `assets/app` directory
   - **You only need to recreate this app if you modify:**
     - The `nest-player.sh` script
     - The app icon
     - The app's behavior or appearance
   - To recreate the app, run:
     ```bash
     ./scripts/create-app.sh
     ```
   - This will create the app in the `assets/app` directory
   - The app is automatically included in the extension package during build

4. Run in development:
   ```bash
   npm run dev
   ```

5. Build the extension:
   ```bash
   npm run build
   ```
   - The build process automatically copies the app from `assets/app` to the distribution package
   - End users will receive the pre-built app and never need to run `create-app.sh`

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