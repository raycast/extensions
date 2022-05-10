# Google Drive Changelog

## [Faster indexing with progress] - 2022-05-06

- Show the indexing progress in percentage + processed/total format.

## [Toggle details] - 2022-05-03

- Added a general action to toggle the right-side details view.

## [Support favorites] - 2022-05-01

- Added ability to favorite/unfavorite files.
- Favorite files are retained both after scheduled files cache invalidation as well as after a forced reindexing.
- Misc code refactoring and optimizations.

## [Optimize file previews cache] - 2022-05-01

- Reuses already generated file preview instead of trying to generate a new one every time the same file is accessed.
- On init, now the extension checks if the maximum number of file previews (500) is exceeded or not. If yes, it removes the least accessed file previews to free up the disk space.

## [New Filter Preferences] - 2022-04-30

- Added flag to display directories.
- Added exclude paths preference.
- Added Reindex action to EmptyView.

## [Use SQLite for file indexing] - 2022-04-28

- Added SQLite to index files cache to fix a crash-causing bug `Error: Worker terminated due to reaching memory limit: JS heap out of memory` happening due to in-memory indexing occurring on a Google Drive containing a large number of files (see https://github.com/raycast/extensions/issues/1523).
- Retained old fuzzy search logic while querying for the files from SQLite.
- Implemented cache invalidation logic.
- The index gets rebuilt if it is older than 7 days.
- Added `Reindex Files Cache` action in the action panel to forcefully rebuild the cache.
- Added logic to automatically purge the temporary file previews in the `/tmp` directory to free-up the disk space if it grows to more than 50 previews.
- Added `Clear File Previews Cache` action in the action panel to clear the file previews generated in the `/tmp` directory.

## [Fix Shortcut Handling] - 2022-04-25

- Prevent crash when a Google Drive Shortcut without necessary permissions is indexed.
- Prevent crash with `._` files.

## [Initial Version] - 2022-04-25

Added initial version code.
