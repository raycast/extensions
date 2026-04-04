# QR Code Scanner Changelog

## [Fix] - 2026-03-30

- Replaced the npm `open` package with Raycast's built-in `open` from `@raycast/api` for URL handling. The npm package bypassed macOS's native URL dispatch, causing all URLs to open in the browser instead of their registered app handlers (deep-links). Using Raycast's `open` correctly delegates to macOS's `open` command, which respects universal links and custom URL scheme registrations.
- Removed the "Open in Browser?" confirmation dialog — URLs now open immediately in the correct app without an extra prompt.

## [Fix] - 2024-03-19

- Fixed a bug that the extension doesn't work when user set `Pop to Root Search` to `Immediately`.
- Updated the extension to use the latest Raycast API.
- Updated `JIMP` which solved `DEP0005`.

## [Fix] - 2023-06-12

- Removed async function declaration which broke React render function
