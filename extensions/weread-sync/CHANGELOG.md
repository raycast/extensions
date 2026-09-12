# WeRead Sync Changelog

## [1.0.0] - 2025-07-17

### Features
- **Browse WeRead Library**: View all your WeRead books with highlights
- **Manual Sync**: Sync individual books or all highlights to Readwise
- **Auto Sync**: Automatically sync new highlights at configurable intervals
- **Sync Status Tracking**: Visual indicators and detailed sync status for all books
- **Incremental Sync**: Smart sync that only processes new highlights since last sync
- **Full Sync**: Complete re-sync option ignoring previous sync status
- **Sync Status Dashboard**: Dedicated view (⌘D) for monitoring sync progress
- **Keyboard Shortcuts**: Quick access to all sync operations
- **Error Handling**: Robust error handling with user-friendly messages
- **Performance Optimizations**: Caching and batch operations for fast sync

### Authentication
- WeRead cookie-based authentication with automatic refresh
- Readwise API token authentication
- Secure credential storage in Raycast's local storage

### Sync Operations
- **Incremental Sync** (⌘I): Sync only new highlights
- **Full Sync** (⌘F): Sync all highlights, ignoring sync status
- **Auto Sync** (⌘⇧A): Toggle automatic background sync
- **Reset Sync Status** (⌘⇧R): Reset sync tracking for complete re-sync

### Technical Features  
- Built with TypeScript and React
- Node.js HTTPS module for reliable API requests
- Comprehensive data validation and filtering
- Real-time sync status tracking with caching
- Batch sync status operations for performance