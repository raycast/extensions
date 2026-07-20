# LocalSend Changelog

## [Major Enhancement - Pending Transfer System] - 2026-01-24

### 🎯 Pending Transfer Notifications
- Added pending transfer system with HTTP connection management
- Incoming transfers now appear in real-time in the Receive view
- Accept/reject transfers with interactive UI
- Sender sees "waiting for response" status during approval
- No more automatic rejection when Quick Save is off

### 🚀 Auto-start Receive Server
- Server automatically starts when opening the Receive command
- Server stops automatically when leaving the view
- No manual server management needed
- Prevents duplicate discovery service instances

### 🎨 Menu Bar Improvements
- Custom LocalSend icon in menu bar
- Quick Save as submenu for cleaner UI
- Consistent icon spacing with placeholder icons
- Proper template image rendering for system theme

### 📁 Better Preferences Organization
- Download Folder and Quick Save moved to top (most used)
- Advanced settings clearly labeled
- Logical grouping by usage frequency
- Improved descriptions with context

### 📚 Documentation
- Comprehensive README with quick start guide
- Feature categorization and tables
- Troubleshooting section
- Security & privacy information
- Keyboard shortcuts reference

### 🐛 Bug Fixes
- Fixed discovery service "already running" messages
- Removed all unused variables and imports
- Proper TypeScript types (no more `any`)
- Code formatting with Prettier
- All ESLint errors resolved

### 🔧 Technical Improvements
- Proper HTTP connection handling for pending transfers
- LocalStorage integration for pending transfer queue
- Separated polling logic from server lifecycle
- Cleaner state management

## [Initial Implementation] - 2026-01-24

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
- Native fetch API (Node.js built-in)
- TypeScript strict mode
- Clean, maintainable code structure