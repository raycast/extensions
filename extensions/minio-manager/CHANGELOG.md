# MinIO Manager Changelog

## [Enhanced Upload & File List] - 2026-01-19

### Upload Improvements
- Implemented concurrent multipart upload for large files
- Added real network upload progress tracking using presigned URLs
- Added configurable upload settings (part size, concurrency, max file size, retry count)
- Added retry logic for failed parts with user choice to retry or abort
- Added cancel upload support

### File List Improvements
- Implemented S3 native server-side pagination using `startAfter` parameter
- Implemented S3 server-side search using `prefix` parameter
- Added loading toast indicator for "Load More" action
- Improved navigation with search state clearing

## [Add Upload Progress] - 2025-12-08
- Added real-time upload progress display
- Improved user experience with animated toast notifications
- Fixed NaN progress display issue
- Changed progress display from form to toast notifications
- Implemented smooth progress transition from 0% to 100%
- Added detailed progress logging for debugging

## [Optimize interactions] - 2025-08-18
- Deleting prompts is more in line with interaction habits

## [Initial Version] - 2025-06-24

- Upload files to MinIO server
- Browse and manage files in MinIO
- List and manage files in MinIO buckets
- Select files directly from Finder
- Generate public URLs for uploaded files
- Generate temporary pre-signed URLs with 1-hour validity
- Automatically copy file URLs to clipboard after upload (optional)
- Support for viewing file previews
