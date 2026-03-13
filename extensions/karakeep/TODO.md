# TODO

- [x] Migrate to new ESLint
- [x] Update dependencies
- [x] Separate Create Bookmark and Create Note commands
- [x] Add support for Raycast Browser Extension to get current URL
- [x] Add character counter for note content
- [x] Add draft saving for note content
- [x] Add preference to enable/disable automatic pre-fill URL from Raycast Browser Extension
- [x] Add no-view command "Quick Bookmark" to optimistically bookmark URL (e.g. from hotkey); store in "Quick Bookmarks" list
- [ ] Add ability to manage lists
  - [ ] Add list creation
  - [ ] Add list deletion
  - [ ] Add list renaming
- [ ] Add support for Raycast AI Tools
- [X] Integrate support for logging with @chrismessina/raycast-logger package

## Raycast API Optimization (Native Pagination & Frecency Sorting)

### Phase 1: Refactor useGetAllBookmarks
- [x] Replace manual state management with native pagination
- [x] Update hook to return `pagination` object
- [x] Test with bookmarks.tsx component
- [x] Verify pagination works correctly

### Phase 2: Update Components for Direct Pagination
- [x] Update BookmarkList to accept `pagination` prop directly
- [x] Remove `loadMore` callback wrapper
- [x] Update bookmarks.tsx to use new API
- [x] Update lists.tsx (ArchivedBookmarks, FavoritedBookmarks)
- [x] Test all bookmark list views

### Phase 3: Refactor Remaining Hooks
- [x] Refactor useGetListsBookmarks with native pagination
- [x] Refactor useGetTagsBookmarks with native pagination
- [x] Update all consumers of these hooks
- [x] Remove old hook implementations

### Phase 4: Add Frecency Sorting
- [x] Integrate useFrecencySorting in main bookmark list
- [x] Track bookmark visits on open actions
- [x] Track bookmark visits on copy actions
- [x] Test frecency sorting behavior

### Phase 5: Testing & Cleanup
- [ ] Test all pagination scenarios (initial load, next page, refresh)
- [ ] Test frecency sorting with multiple bookmark interactions
- [x] Remove refactored.ts example file
- [x] Update documentation
- [x] Verify no rendering loop warnings
