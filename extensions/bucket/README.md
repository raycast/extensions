# Bucket Bookmarks

Search, save, and organize your bookmarks with powerful search, AI organization, and seamless sync across devices.

## Getting Started

### Authentication

Bucket offers two authentication methods:

#### Device Connection (Recommended)

The easiest way to get started - takes about 30 seconds:

1. Run the **Connect Device** command in Raycast
2. You'll see a 6-character pairing code (e.g., `ABC-123`)
3. Open [bucket.aevr.space/settings](https://bucket.aevr.space/settings) in your browser
4. Navigate to **Settings → Connect Device**
5. Enter your pairing code and click **Connect**
6. Done! Your device is now connected

#### API Token

For users who prefer long-lived tokens:

1. Open [bucket.aevr.space](https://bucket.aevr.space) and sign in
2. Go to **Settings → API Tokens**
3. Click **Create New Token** and give it a name (e.g., "Raycast")
4. Copy the token (you won't see it again!)
5. Open Raycast Preferences (`⌘,`) → Extensions → Bucket Bookmarks
6. Change **Authentication Method** to "API Token"
7. Paste your token in the **API Token** field

## Features

### Search Bookmarks

Quickly find any bookmark with fuzzy search across titles, URLs, descriptions, and tags.

**Keyboard Shortcuts:**

- `Enter` - Open bookmark in browser
- `⌘C` - Copy URL
- `⌘⇧C` - Copy title
- `⌘E` - Edit bookmark
- `⌘F` - Toggle featured status
- `⌘⇧O` - Run AI organization
- `⌃X` - Delete bookmark

### Save Bookmark

Save URLs from your clipboard with one command. Automatically detects URLs and fetches metadata.

**Features:**

- Auto-fills URL from clipboard
- Optional title, description, and tags
- Assign to folders during creation
- Automatic metadata fetching

### Menu Bar

Access your most recent and featured bookmarks directly from the menu bar.

### Manage Authentication

View your connection status, switch between authentication methods, and manage your devices.

## Troubleshooting

### "Not authenticated" error

**If using Device Connection:**

1. Run **Manage Authentication** to check your status
2. If disconnected, run **Connect Device** again
3. Ensure you approved the connection in the web app

**If using API Token:**

1. Verify your token is valid in the web app
2. Check it's correctly pasted in preferences
3. Try creating a new token if needed

### Device connection not working

1. Check your internet connection
2. Ensure you're logged into the web app
3. Pairing codes expire after 15 minutes - generate a new one
4. Try again with **Connect Device**

### Bookmarks not syncing

1. Check your authentication status with **Manage Authentication**
2. Refresh the search command (`⌘R`)
3. Verify bookmarks exist in the web app
4. Check your internet connection

## Support

- **Web App**: [bucket.aevr.space](https://bucket.aevr.space)
- **Email**: support@bucket.aevr.space
- **GitHub**: Report issues and request features

## Privacy & Security

- Device pairing codes expire after 15 minutes
- Tokens are stored securely in Raycast's LocalStorage
- Each device gets a unique authentication token
- Revoke device access anytime from the web app
- No analytics or tracking
