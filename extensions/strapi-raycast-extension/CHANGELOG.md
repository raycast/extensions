# Strapi Changelog

## [Improvements] - {PR_MERGE_DATE}

- Load all entries and files with pagination (previously limited by Strapi's `maxLimit`)
- Search entries and files server-side
- Filter entries by draft/published status and locale
- Add entry details panel with copy actions for document ID, API URL and JSON
- Add "Copy Markdown" and "Copy File ID" actions to the media library
- Show a helpful message with a link to the preferences when Strapi can't be reached
- Fix "Open in Strapi" for single types
- Fix media URLs for upload providers like S3 and Cloudinary
- Fix entry titles showing `[object Object]` or crashing on empty fields
- Support hosts with a trailing slash
- Update dependencies

## [Clean up] - 2025-01-30

- Remove remaining preferences type references
- Add 'Compatibility' section to README

## [Initial Version] - 2025-01-30
