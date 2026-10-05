# Jellyamp

Search and play music directly from your self-hosted Jellyfin server - right inside Raycast.

## Features

- Search tracks, albums, and artists on your Jellyfin library
  - Album cover art and track info is displayed in the search results
- Play music instantly via your preferred media player
- Supports API Key or Username & Password authentication

## Setup

### 1. Server URL

Enter your Jellyfin server URL, including the port if needed (e.g., `http://192.168.1.10:8096` or `https://jellyfin.example.com`).

### 2. Authentication

Choose one of the following methods:

**Option A — API Key + User ID** _(recommended)_

- **API Key**: Generate one in Jellyfin under **Administration → Dashboard → API Keys → + New Key**.
- **User ID**: Go to **Administration → Users → click your user** and copy the ID from the end of the URL.

**Option B — Username & Password**

- Enter your Jellyfin username and password. No User ID or API Key needed.

### 3. Where to Enter Your Details

You can configure the extension in two ways:

- **On first run**: Run the `Search Music` command and you'll be prompted to enter your details right away.
- **Via Raycast Settings**: Go to **Settings → Extensions → Jellyamp** and fill in the preference fields.

### Advanced Options _(optional)_

- **Media Player Executable**: By default, Jellyamp opens tracks using your OS default for `.m3u` files. To use a specific player, enter its full executable path (e.g., `C:\Program Files\VideoLAN\VLC\vlc.exe` on Windows or `/Applications/VLC.app/Contents/MacOS/VLC` on macOS).
- **Stream Audio Codec**: Choose the codec used when streaming. `Copy (original format)` streams without transcoding. MP3, AAC, and Opus are also available.

## Security

Your credentials are handled securely:

- All credentials saved via the in-extension setup form are stored in **Raycast's LocalStorage**, which is encrypted at rest by the platform.
- When credentials are entered via **Raycast Settings**, the API Key and Password fields use Raycast's built-in password storage, which is backed by your OS credential store.
- When using Username & Password authentication, only the resulting session token (not the password) is cached locally after login.
