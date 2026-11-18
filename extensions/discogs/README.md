# Raycast Discogs Database Search Extension

This Raycast extension allows you to easily search the Discogs database for releases.

## Usage

Simply type the `Discogs Search` command in Raycast and start searching the Discogs database for releases. You can now:
- Search Vinyl
- Search for Any Release
- Search by Barcode
- Search by Release Number (CatNo)

You can also run **Search Current Music Track** to open a Discogs browser search for the track currently playing in Apple Music. This command is available on macOS and does not require a Discogs Personal Access Token.

## Configuration

The Discogs API search commands require a Personal Access Token. It is optional for the extension as a whole, so **Search Current Music Track** can be used without one.

1. Open Raycast Preferences using `cmd+,`
2. Go to the Extensions tab
3. Find the Discogs Database Search Extension, click it.
4. Enter your Discogs Personal Access Token and submit.

The extension supports Windows, but **Search Current Music Track** uses Apple Music and is only available on macOS.

## Development

This extension is developed using React and Raycast's extension API. If you want to contribute, please feel free to submit a pull request.

## About Discogs

Discogs is a website with a crowdsourced database of information about audio recordings, including commercial releases, promotional releases, and bootleg or off-label releases.
