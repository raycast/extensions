# Nest Camera Raycast Extension

A Raycast extension that provides quick access to your Google Nest camera feeds through RTSP streaming. View your cameras instantly through Safari using FFmpeg transcoding and HLS playback. This extension is specifically designed for the Nest Cam Indoor (1st gen) model.

## Camera Compatibility

This extension is built specifically for:
- **Nest Cam Indoor (1st generation)**
  - Only supports RTSP streaming
  - Does not support newer protocols like WebRTC
  - Requires FFmpeg for transcoding to HLS

Other Nest camera models are not currently supported as they use different streaming protocols.

## Features

- 🎥 Instant access to Nest camera feeds through RTSP streaming
- 🔄 FFmpeg transcoding to HLS for native Safari playback
- 🔍 Quick search and filter through your cameras
- ⭐️ Favorite cameras for hotkey access
- 📍 Window position memory per camera
- 🖼 Picture-in-Picture mode support
- 🔐 Secure OAuth2 authentication with PKCE

## Prerequisites

1. Nest Cam Indoor (1st generation)
2. macOS 12.0 or later
3. Raycast 1.50.0 or later
4. FFmpeg installed (`brew install ffmpeg`)
5. Google Device Access registration ($5 one-time fee)
6. Google Cloud OAuth2 client credentials

## Installation

1. Install FFmpeg:
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
   - Enter to open in Safari
   - ⌘+Enter for Picture-in-Picture mode
   - ⌥+Enter to set as favorite

## Troubleshooting

### Stream Not Loading
1. Check camera online status in Google Home
2. Verify FFmpeg installation:
   ```bash
   ffmpeg -version
   ```
3. Check network connectivity
4. Try refreshing the authentication

### Authentication Issues
1. Verify OAuth credentials
2. Check Google Cloud Console for API quotas
3. Re-authenticate through extension settings

## Known Limitations

- Only supports Nest Cam Indoor (1st generation)
- RTSP streaming only (WebRTC not supported)
- One camera stream at a time
- Safari required for HLS playback
- macOS only

## Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nest-raycast-extension.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development:
   ```bash
   npm run dev
   ```

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
- [FFmpeg](https://ffmpeg.org)
- All contributors and users 