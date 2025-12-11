# Hooks Plan

- `useImgBedList`: Wraps `listFiles` with `useCachedPromise`, exposing `items`, `isLoading`, `error`, `revalidate`, `setFilters`, and `deleteFile`.
- `useUpload`: Combines form inputs and preferences, handles clipboard/file uploads, and returns the data needed for copy actions.
- (Future) `useClipboardImage`: Detects whether the clipboard contains an image or image URL, so clipboard commands can reuse the logic.
