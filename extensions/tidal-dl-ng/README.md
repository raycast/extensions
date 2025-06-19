# Tidal Downloader Raycast Extension

Download Tidal tracks, albums, and playlists using tidal-dl-ng directly from Raycast. Supports both local execution and remote SSH servers.

## Features

- **Download from URL** - Download any Tidal content by providing its URL
- **Login Management** - Authenticate with your Tidal account
- **Download Favorites** - Batch download your favorite tracks, albums, artists, or playlists
- **Configuration** - View and edit tidal-dl-ng settings

## Prerequisites

- [tidal-dl-ng](https://github.com/exislow/tidal-dl-ng) installed locally or on remote server
- Valid Tidal subscription
- For remote execution: SSH access to the server

## Installation

### Install tidal-dl-ng

```bash
pip install tidal-dl-ng
```

### Install the Raycast Extension

1. Clone this repository or download the extension
2. Open the extension folder in Terminal
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start development mode
5. The extension will appear in Raycast

## Configuration

### Extension Preferences

Configure these in Raycast Preferences → Extensions → Tidal Downloader:

- **Execution Mode**: Choose between local or remote (SSH) execution
- **Remote Host**: SSH server hostname or IP (for remote mode)
- **SSH Port**: SSH server port (default: 22)
- **SSH Username**: Username for SSH connection
- **SSH Key Path**: Path to SSH private key file
- **SSH Password**: Password for SSH (if not using key)

### First Time Setup

1. Open the **Login to Tidal** command
2. Follow the terminal instructions to authenticate
3. Once logged in, you can start downloading content

## Commands

### Download from URL

Downloads a specific Tidal track, album, playlist, video, or artist.

**Usage:**
- Open command and enter a Tidal URL
- Or use with argument: `Download from URL https://tidal.com/browse/track/12345678`

**Supported URLs:**
- Tracks: `https://tidal.com/browse/track/12345678`
- Albums: `https://tidal.com/browse/album/12345678`
- Playlists: `https://tidal.com/browse/playlist/uuid`
- Videos: `https://tidal.com/browse/video/12345678`
- Artists: `https://tidal.com/browse/artist/12345678`

### Login to Tidal

Manage your Tidal authentication status.

**Features:**
- Check login status
- Login to Tidal account
- Logout from Tidal

### Download Favorites

Batch download your Tidal favorites.

**Options:**
- **Favorite Tracks** - All your liked tracks
- **Favorite Albums** - All your liked albums
- **Favorite Artists** - All tracks from favorite artists
- **Favorite Playlists** - All your saved playlists

### Configuration

View and modify tidal-dl-ng settings.

**Common Settings:**
- `quality` - Audio quality (NORMAL, HIGH, HI_RES, LOSSLESS)
- `download_path` - Where files are saved
- `album_folder_format` - Album folder naming pattern
- `track_file_format` - Track file naming pattern
- `include_lyrics` - Download lyrics files
- `include_covers` - Download album artwork

## Remote SSH Setup

For remote execution, ensure:

1. tidal-dl-ng is installed on the remote server
2. SSH key authentication is configured (recommended)
3. The remote user has write permissions to the download directory

### SSH Key Setup

```bash
# Generate SSH key if needed
ssh-keygen -t rsa -b 4096

# Copy to remote server
ssh-copy-id user@remote-server

# Test connection
ssh user@remote-server "tidal-dl-ng --version"
```

## Troubleshooting

### Extension not working

1. Ensure tidal-dl-ng is installed: `which tidal-dl-ng`
2. Check you're logged in: Use the Login command
3. For remote mode, verify SSH connection works

### Downloads failing

1. Check your Tidal subscription is active
2. Verify download path exists and is writable
3. Check available disk space

### SSH connection issues

1. Test SSH manually: `ssh user@host`
2. Check SSH key permissions: `chmod 600 ~/.ssh/id_rsa`
3. Ensure sshpass is installed for password auth

## Development

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## License

MIT