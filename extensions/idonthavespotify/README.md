# I Don't Have Spotify

Convert music links between streaming services from Raycast or Raycast AI.

## Setup

Set **Self-Hosted Instance URL** in Extension Preferences to your own [I Don't Have Spotify instance](https://github.com/sjdonado/idonthavespotify#self-hosting).

The public instance now requires an email login in the browser and does not issue API tokens. Direct conversion from Raycast needs a self-hosted instance with search enabled. Signing in on the website does not sign this extension in. You can still use **Open Website** to convert in your browser.

## Commands

- **Convert Link to All Platforms** reads a music URL from the clipboard, or accepts one pasted into its search field. Open or copy individual matches, copy a universal sharing link, or copy all available platform links.
- **Convert Link to Spotify / YouTube Music / Apple Music / Deezer / SoundCloud / Tidal / Qobuz / Bandcamp / Pandora** converts the clipboard URL to that destination and copies the result. Enable these commands in Raycast Settings when needed.

Verified matches have a checkmark. Unverified matches have a question mark and should be checked before sharing. Results marked unavailable by the service are omitted. Availability depends on the source link and destination service.

Audio previews are available when the service returns one and a compatible audio player is installed. The last conversion is cached for one hour and only reused with the same instance.

## Raycast AI

Mention `@idonthavespotify` in Raycast AI and provide a music URL:

- "Convert https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT to Apple Music."
- "Make a universal sharing link for https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT."
- "Which streaming services can I convert links to?"

The **Convert Music Link** tool returns metadata, available destination links, match verification, and a universal sharing URL. Omit the destination to get all available platforms. **Get Supported Platforms** lists the nine destination services.

The tools use your configured instance. They return links without reading or changing the clipboard, opening a browser, or playing music. They do not search by song title or transfer playlists.

## Development

- `npm test` runs conversion, clipboard, cache, and AI tool regression tests with mocked service responses.
- `npm run build` compiles the commands and AI tools and checks TypeScript.
- `npm run lint` validates the manifest, icons, code, and formatting.
- `npx ray evals` checks AI tool selection and responses using the mocks in `ai.yaml`. Raycast authentication is required.

[Conversion service source and API documentation](https://github.com/sjdonado/idonthavespotify)
