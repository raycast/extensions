# I Don't Have Spotify Changelog

## [New Commands] - 2024-07-31

- Convert link from clipboard and copy it back for each platform.
- Generate audio temp file path using built-in libraries.
- Open extension preferences action panel.
- Fix Command EmptyView validation.
- Fix `cleanLastSearch` if search text is empty.
- Fix Command wrap search text and results in a single state.
- Fix Replace `SPOTIFY_LINK_REGEX` with a flexible `LINK_REGEX`, delegating full validation to the server.

## [Fix] - 2024-01-31

- Fix Error: Missing required property "title" for List.Item
- Replace isVerified text with an icon
- Update hostname + SPOTIFY_LINK_REGEX
- Fix cache vs clipboard validation

## [Fix] - 2023-11-06

- Corrected the hostname from which the data was fetched from

## [API Schema updates] - 2023-10-19

- Upgrade to API v1.3
- Mobile links support
- Fix spotify link validations

## [Deezer link] - 2023-04-10

- Upgrade to API v1.2
- Deezer link
- No available links validation

## [Initial Version] - 2023-03-28

- Paste or copy from Clipboard a Spotify Link
- Click on Link to Open in Browser
- Play Audio Preview
