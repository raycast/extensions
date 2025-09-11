# Last.fm Changelog

## [Major Scrobbling Features + UI Enhancements] - {PR_MERGE_DATE}

### 🎵 New Features
- **Background Scrobbling** - Automatically detects and scrobbles your music every 30 seconds
- **Scrobbling Dashboard** - Beautiful interface to view status and manage your scrobbling queue
- **Multi-Player Support** - Works seamlessly with both Apple Music and Spotify
- **Smart Scrobbling Logic** - Follows Last.fm standards (50% played OR 4 minutes minimum)
- **Queue Management** - Offline support with automatic retry for failed scrobbles

### 🔐 Authentication
- **Session Key Integration** - Secure Last.fm authentication for scrobbling capabilities
- **Automatic Validation** - Ensures your credentials stay valid and connected

### 🎛️ User Interface
- **Real-time Status** - Live indicators showing current track progress and scrobbling state
- **Queue Statistics** - View pending, failed, and successfully scrobbled tracks
- **Keyboard Shortcuts** - Quick actions with ⌘P (process queue) and ⌘D (clear queue)
- **Progress Tracking** - Visual progress bars and percentage displays

### ⚙️ Configuration
- **Customizable Intervals** - Set scrobbling check frequency (15s, 30s, or 60s)
- **Minimum Duration** - Configure minimum play time before scrobbling
- **Background Operation** - Runs automatically without interrupting your workflow

### 🎨 Technical Improvements
- **Modern ESLint Configuration** - Updated to latest linting standards for better code quality
- **Asset Optimization** - Improved placeholder images and streamlined metadata
- **Code Quality** - Enhanced type safety and development experience

---

*This major update transforms the Last.fm extension from read-only to a complete scrobbling solution, automatically tracking your music alongside the existing Last.fm browsing features.* 