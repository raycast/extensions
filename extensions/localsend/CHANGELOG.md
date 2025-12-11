# localsend Changelog

## [Initial Implementation] - {PR_MERGE_DATE}

### Core Features
- Discover LocalSend devices on the network using multicast and HTTP
- Send files to LocalSend devices with drag-and-drop support
- Send clipboard content to nearby devices quickly
- Receive files from other LocalSend devices via HTTP server
- Full LocalSend protocol v2.1 compliance

### File Transfer
- Support for multiple file selection
- File metadata (modified/accessed dates)
- Automatic cancellation on upload failure (cancel session API)
- Handle all HTTP status codes (204, 401, 403, 409, 429, 500)
- Support for text, files, and media transfers
- PIN-protected transfers

### Device Management
- Favorite devices with persistent storage
- Star/unstar devices for quick access
- Favorite devices shown in separate section
- Remember recently used devices
- Device fingerprint tracking
- Automatic IP tracking for favorites

### Settings & Configuration
- Configurable device name (defaults to computer name)
- Custom HTTP port (default: 53318 to avoid conflicts with LocalSend app)
- Custom download folder with tilde expansion
- Auto-start receive server option
- All settings accessible via Raycast preferences (Cmd + ,)

### Network & Discovery
- Multicast UDP discovery (primary method)
- HTTP/TCP fallback discovery
- Scan multiple common ports (53317, 53318, 53319)
- Avoid port conflicts with LocalSend app
- Exclusive:false socket binding for concurrent operation

### Developer Features
- Modern Node.js v24 patterns
- Arrow functions throughout
- Native fetch API via node-fetch
- TypeScript strict mode
- Clean, maintainable code structure