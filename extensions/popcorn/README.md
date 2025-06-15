<h1><img src="/assets/extension-icon.png" width="25" height="25"/>  Popcorn for Raycast</h1>

<div>
  <img src="/metadata/popcorn-1.png" width="30%"/>
  <img src="/metadata/popcorn-2.png" width="30%"/>
  <img src="/metadata/popcorn-3.png" width="30%" />
</div>

A Raycast extension that uses the Stremio API to search for movies and TV shows and stream them to local media players using Stremio addons. IINA is highly recommended for macOS users.

## Features

- 🎬 Search for movies and TV series
- ⚙️ Stremio addon support
- 🔗 Stream directly into IINA, VLC, or any app of choice
- ✅ Mark TV episodes as watched
- 👁️ Recently watched content
- 📋 Copy stream URLs to clipboard

## Setup

Currently this extension is under review and has not yet been accepted on the Raycast extension store.

If you would like to install it before it is accepted, follow the instructions below.

1. Install Node.js
   - Option A: Download from https://nodejs.org/
   - Option B: Use brew `brew install node`
2. [Download](https://github.com/martipops/popcorn-raycast/archive/refs/heads/main.zip) or clone this repository
    - If you downloaded the .zip file, extract it to a folder in a safe place (e.g. Documents folder)
2. Open Terminal and navigate to the extracted directory
   - EX. `cd ~/Documents/popcorn-raycast-main`
3. Build the application by running `npm i; npm run build` (You should only need to do this once)
4. Open Raycast and search for "Import Extension"
5. Find and select the extension folder.
6. Configure your Stremio addon URL in the extensions preferences (e.g., `https://your-addon.com/manifest.json`)
7. Start searching for content!


## Usage

1. **Search Streams**: Type to search for movies or TV shows
2. **Explore Streams** *(COMING SOON)*: Explore popular movies and TV shows

## Full-functionality Requirements

- A Stremio addon that provides streams
- Media player (IINA or VLC recommended)

## License

MIT
