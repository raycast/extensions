# Gyazo Search

<img src="./assets/extension-icon.png" width="70" />

Search your Gyazo images directly from Raycast and quickly copy URLs to clipboard.

## Features

- **Search Images**: Quickly find images in your Gyazo account using keywords
- **Browse Collection**: View all your Gyazo images when no search term is provided
- **Copy URLs**: Easily copy permalink or direct image URLs to clipboard
- **Adjustable Grid**: Change the grid size to view more or fewer images at once
- **Open in Browser**: Open images directly in your browser with one click

## Screenshots

<div>
  <img src="./metadata/screenshot-1.png" width="700" alt="Gyazo Search Grid View" />
</div>

## Requirements

- A Gyazo account and a valid Gyazo API access token
- A Gyazo Ninja subscription is required to use the search functionality
  - Note: If no search query is provided, the extension uses the List API which works with free accounts

## Setup

1. Visit [Gyazo OAuth Applications](https://gyazo.com/oauth/applications) and sign in to your account
2. Create a new application or use an existing one
3. Generate an access token
4. Install this extension in Raycast
5. Open the extension preferences and paste your access token

## Usage

1. Open Raycast and type "Gyazo"
2. Select "Search Gyazo" from the results
3. Type your search query or leave empty to browse all images
4. Use the dropdown in the search bar to adjust the grid size
5. Click on an image to see available actions:
   - Copy permalink to clipboard
   - Copy direct image URL to clipboard
   - Open in browser
   - Load more images

## Keyboard Shortcuts

- `Enter`: Copy permalink to clipboard
- `Cmd+Enter`: Copy direct image URL to clipboard
- `Cmd+L`: Load more images

## Privacy

This extension only accesses your Gyazo images using the provided access token. No data is collected or shared with third parties.

## Credits

- Icon and screenshots from [Gyazo](https://gyazo.com)
- Built with [Raycast API](https://developers.raycast.com)

## License

MIT License
