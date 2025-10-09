# DuckDuckGo Image Search Changelog

## [Configurable Primary Action] - {PR_MERGE_DATE}

- Added a new preference to choose between Quick Look or Open in Browser as the primary action
- Added `Open With` option in the context menu to open images with other supported applications

## [Save image] - 2025-10-09

- Added functionality to save images.
- Added a preference to set the save directory for images.

## [Potential fix of error] - 2025-08-19

- Originally the exception happened in the `src/search-image.tsx:96:37`:

## [Initial Version] - 2025-08-04

```
search-image | TypeError: Cannot read properties of undefined (reading 'length')
```
