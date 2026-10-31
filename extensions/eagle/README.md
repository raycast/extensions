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

## AI Tools

Mention `@eagle` in Raycast AI to find assets, inspect the active library and its folders, import a single asset, or update an item's metadata. AI tools require **Eagle 4.0 Build 21 or later**, running on the same Mac. Local access needs no API token.

- **Get Library** returns the active library identity and existing folders with full paths.
- **Find Items** searches with pagination or looks up an exact ID. Results include notes, tags, folders, ratings, source URLs, and `eagle://` links.
- **Import Item** accepts one readable local file or public HTTP(S) direct asset URL. A source webpage URL can be recorded separately. It does not capture webpages or screenshots, and it never deletes the local source.
- **Update Item** changes only specified names, source URLs, notes, or explicit integer ratings from 0 to 5. Tags and folder memberships are additive. Omitted metadata is preserved.

For example, ask “Find material studies in my library” or “Rate this item four stars.” Before a write, the tools check the library identity and show a native Raycast confirmation with the library, folder paths, and intended changes. Folders must already exist.

Imports are verified against Eagle's saved library collection and the item's non-empty original file inside the native library. A provisional item awaiting Eagle's duplicate-file decision does not count as saved. Local originals must also match the source's size and SHA-256 hash. Importing can be asynchronous: `pending` or `uncertain` means the result has not been verified. Resolve any duplicate alert in Eagle, then repeat the same input to reconcile the reserved item ID; the extension will not send a second import request for that source in that library. Cancel or Use Existing can remove the reserved item, so inspect existing items before trying another capture. Recovery records remain in the extension's support directory, including after success. If a file's contents change at an already imported local path, use a new path for the replacement asset. Use Update Item for later metadata changes. Search before importing assets from different paths or URLs to avoid duplicates.

Remote assets must be publicly downloadable without authentication and are limited to 100 MiB and a 60-second download deadline. Every connection, including redirects, uses validated public IP addresses. The extension stages the downloaded bytes privately and imports that local file, preserving the source URL and verifying the original against the downloaded size and SHA-256 hash. Owned staging files remain while an import is pending or uncertain and are removed after verified success; local source files are never removed. HTML webpages and private network hosts are rejected. These tools use Eagle's native API and do not run an image model, create folders, delete assets, or alter Eagle's metadata files directly.

Eagle does not offer an atomic library or metadata compare-and-swap operation. The tools recheck the library immediately before a write and merge additions from freshly read metadata, but another client can still switch libraries or edit an item during the final request. An uncertain update must be read back in the intended library before retrying.

## Development

```bash
npm install
npm run dev
```

Run `npm test`, `npm run lint`, and `npm run build` before submitting changes. The focused tests use temporary files and a simulated Eagle client; they do not modify a real Eagle library. `ai.yaml` contains sanitized eval mocks; `npx ray evals` tests AI tool selection using those mocks without executing the tools.

## Requirements

- macOS
- Eagle app installed and running
- Eagle API server enabled (default: http://localhost:41595)
