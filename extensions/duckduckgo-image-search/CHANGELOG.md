# DuckDuckGo Image Search Changelog

## [Windows Support] - 2025-10-13

- Added platform-specific shortcuts for macOS and Windows.
- Extended supported platforms to include Windows.
- Introduced a fallback for the download directory and added validation.
- Standardized naming to "DuckDuckGo" in metadata and documentation.

## [Save image] - 2025-10-09

- Added functionality to save images.
- Added a preference to set the save directory for images.

## [Potential fix of error] - 2025-08-19

- Originally the exception happened in the `src/search-image.tsx:96:37`:

## [Initial Version] - 2025-08-04

```
search-image | TypeError: Cannot read properties of undefined (reading 'length')
```
