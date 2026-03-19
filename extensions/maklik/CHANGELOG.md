# Maklik Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Added a no-view command to capture a screenshot region, compress it, upload it to S3-compatible storage, and copy the public URL.
- Added configurable extension preferences for S3/R2 uploads, compression size targets, key prefixes, and retry behavior.
- Added local fallback handling that saves failed uploads to disk and copies the saved file path.
