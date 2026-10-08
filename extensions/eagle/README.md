# Eagle

Eagle Extension for Raycast - Manage your Eagle assets directly from Raycast.

## Features

### Implemented ✅

- **Search Items** - Search and browse items in your Eagle library with keyword filtering
- **Navigate Folders** - Browse folders and view items organized by folders
- **Trash Management** - View and manage items in trash
- **Library Switcher** - Switch between multiple Eagle libraries with active library indicator
- **Add from URL** - Add images or files from URLs to Eagle
- **Add from Clipboard** - Add URLs or file paths from clipboard to Eagle
- **Item Details** - View detailed information including thumbnails, tags, folders, color palettes, and metadata
- **Edit Item Tags** - Update tags for items
- **Edit Item Annotation** - Update notes/annotations for items
- **Folder Management** - Create, rename, and move folders
- **Folder Navigation** - Navigate to item folders directly from items (with multi-folder dropdown)
- **Move to Trash** - Delete items with confirmation dialog
- **Reveal in Folder** - Open item location in Finder
- **Grid/List View** - Toggle between grid and list layouts via preferences

### API Coverage

#### Application APIs
- ✅ `/api/application/info` - Get Eagle application information

#### Folder APIs
- ✅ `/api/folder/list` - List all folders in library
- ✅ `/api/folder/create` - Create new folder
- ✅ `/api/folder/rename` - Rename existing folder
- ✅ `/api/folder/update` - Update folder properties
- ❌ `/api/folder/listRecent` - List recently accessed folders

#### Item APIs
- ✅ `/api/item/info` - Get item information (via thumbnail)
- ✅ `/api/item/thumbnail` - Get item thumbnail
- ✅ `/api/item/list` - List items with filtering
- ✅ `/api/item/moveToTrash` - Move items to trash
- ✅ `/api/item/addFromURL` - Add item from URL
- ✅ `/api/item/addFromPath` - Add item from local file path
- ✅ `/api/item/update` - Update item properties (tags, annotation, etc.)
- ❌ `/api/item/addFromURLs` - Add multiple items from URLs
- ❌ `/api/item/addFromPaths` - Add multiple items from local paths
- ❌ `/api/item/addBookmark` - Add bookmark item
- ❌ `/api/item/refreshPalette` - Refresh item color palette
- ❌ `/api/item/refreshThumbnail` - Regenerate item thumbnail

#### Library APIs
- ✅ `/api/library/info` - Get current library information
- ✅ `/api/library/history` - Get recently opened libraries
- ✅ `/api/library/switch` - Switch to different library
- ✅ `/api/library/icon` - Get library icon

## TODO - Potential Features

### High Priority 🔥

- [ ] **Recent Folders** - Quick access to recently used folders
- [ ] **Restore from Trash** - Add restore action for trashed items
- [ ] **Permanent Delete** - Permanently delete items from trash
- [ ] **Empty Trash** - Clear all items from trash

### Medium Priority 🎯

- [ ] **Refresh Thumbnail** - Regenerate thumbnails for items
- [ ] **Refresh Color Palette** - Update color palette extraction
- [ ] **Copy Item** - Duplicate items within library
- [ ] **Move to Folder** - Move items between folders
- [ ] **Batch Add from URLs** - Add multiple items from URLs at once
- [ ] **Batch Add from Paths** - Add multiple items from file paths at once

### Low Priority 💡

- [ ] **Add Bookmark** - Save web bookmarks to Eagle
- [ ] **Batch Operations** - Multi-select and batch actions
- [ ] **Search by Tags** - Filter items by specific tags
- [ ] **Search by Color** - Find items by color palette
- [ ] **Smart Folders** - Create and manage smart folders
- [ ] **Export Items** - Export items to file system
- [ ] **Item Ratings** - Add/edit item ratings

### Nice to Have ✨

- [ ] **Keyboard Shortcuts** - Customizable shortcuts for common actions
- [ ] **Quick Look** - Preview items using macOS Quick Look
- [ ] **Share Items** - Share items via macOS share sheet
- [ ] **Statistics** - Library statistics and insights
- [ ] **Search Filters** - Advanced filtering (by date, size, type, etc.)
- [ ] **Recently Added** - View recently added items
- [ ] **Favorites** - Mark and quick access to favorite items

## Development

```bash
npm install
npm run dev
```

## Requirements

- macOS
- Eagle app installed and running
- Eagle API server enabled (default: http://localhost:41595)
