# Transmission Changelog

## [Fix] - 2025-06-25

- Fixed generation of SVG files

## [Usability improvements] - 2024-05-22

- Add a dedicated default download directory 

## [ETA] - 2024-04-24

- Add an ETA to the torrent details
- Fix a small isse where the cell images are undefined, should show no string

## [Code improvements] - 2024-04-16

- Refactor the code, splitting the `listTorrents` file into separate components
- Update command because <kbd>Cmd</kbd> + <kbd>,</kbd> is reserved by Raycast
- Fix a bug where the extension tries to read files that are not in `localhost`
- Fix a memory leak in `TorrentConfiiguration` component
- Fix a bug where too many files are loaded in a big torrent (added a configurable limit (max 100))
- Update dependencies, cleaning up unnecessary ones

## [Fix remove torrent and delete local data] - 2024-01-15

- "Delete local data" option when removing torrent fixed.

## [Usability improvements] - 2023-04-30

- Use the password type for a field storing a password.

## [Error Handling and Pieces Graph] - 2022-03-25

- Torrents with an error state are now displayed with a different icon and have their error visible on the details panel;
- The pieces graph is now large as the detail panel and don't take that much vertical space anymore;

## [User interface improvements and new features] - 2022-03-13

- Added a new side panel to show more torrent details;
- Added a settings page to configure individual torrents;
- Improved the torrent context menu with more options, icons, etc;
- Improved the "Add Torrent" command to support .torrent files and automatically read from clipboard
- Added screenshots and metadata for the store listing;
- Added this changelog;

## [Added Transmission] - 2021-10-26

Initial version of the Transmission client for Raycast.
