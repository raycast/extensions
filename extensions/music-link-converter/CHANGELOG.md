# Music Link Converter Changelog

## [Add AI commands] - 2026-01-09
- Bump dependencies
- Add tools: search-providers, update-providers, convert-music-link
  - search-providers: lists providers
  - update-prodivers: allows updating providers (enable/disable)
  - convert-music-link: allows same behavior as existing command but via tools
- Due to new tool addition we can use AI to interact with these features (check evals in package.json for examples)
- Add command: manage-providers
  - So that we can select which providers we're interested in
- Added actions: "Copy All URLs", "Copy All URLs with Labels", "Manage Providers"
- Updated the architecture and project structure so that we can re-use the code and avoid redundancies

## [Add tidal url] - 2024-12-12
- Add Tidal URL support for the `https://tidal.com/` format.
- Add a toast for unsupported music links.

## [Initial Version] - 2024-02-03
- Initial release
- Detects Spotify, Apple Music, Youtube, Youtube Music, Amazon Music, Deezer, Soundcloud, Tidal, Anghami links.
