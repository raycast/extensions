# Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Search

- Real-time search with results as you type (min 3 chars)
- Advanced search with form-based regex validation
- Configurable timeout (5-60s) and max results (50-500)
- Toggle regex mode (⌘R)
- Search history with persistence

### Results

- File preview with context lines
- Results grouped by file
- Syntax highlighting based on file extension

### File Actions

- Open file
- Open in VS Code (⇧⌘O)
- Open in Xcode (⇧⌘X)
- Show in Finder
- Open containing folder
- Replace in file (⇧⌘R)

### Copy Actions

- Copy line content (⌘.)
- Copy match with context (⇧⌘.)
- Copy file path (⇧⌘C)
- Copy search pattern (⌘C)

### Settings

- Change search directory (⌘L)
- Reset to home directory (⇧⌘H)
- Change timeout (⇧⌘T)
- Change max results (⇧⌘M)

### Performance

- Object pooling for grep entries
- LRU cache for file context
- Web Streams API for efficient parsing
