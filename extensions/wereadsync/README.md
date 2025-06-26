# WeRead Sync

Sync your highlights from WeRead to Readwise automatically and efficiently.

## Features

- **📚 Browse WeRead Library**: View all your WeRead books with highlights
- **⚡ Quick Sync**: Manual sync individual books or all highlights  
- **🔄 Auto Sync**: Automatically sync new highlights at regular intervals
- **📊 Sync Status**: Detailed sync status tracking with visual indicators
- **🎯 Incremental Sync**: Smart sync that only processes new highlights
- **🔧 Full Sync**: Complete re-sync option when needed

## Setup

### Prerequisites

1. **WeRead Account**: Active account with highlighted books
2. **Readwise Account**: Account with API access

### Configuration

1. Install the extension from Raycast Store
2. Run the "WeRead Sync" command
3. Click "Settings" to configure:

#### WeRead Cookie
1. Open [WeRead](https://weread.qq.com) in your browser
2. Login to your account
3. Open Developer Tools (F12)
4. Go to the Network tab
5. Refresh the page
6. Find any request and copy the `Cookie` header value
7. Paste it in the WeRead Cookie field

#### Readwise Token
1. Go to [readwise.io/access_token](https://readwise.io/access_token)
2. Login to your account
3. Copy your access token
4. Paste it in the Readwise Access Token field

## Usage

### Commands

- **View WeRead Books**: Browse your library and sync highlights
- **Settings**: Configure authentication credentials

### Sync Operations

- **Incremental Sync** (⌘I): Sync only new highlights since last sync
- **Full Sync** (⌘F): Sync all highlights, ignoring sync status
- **Auto Sync** (⌘⇧A): Toggle automatic sync on/off
- **Sync Status** (⌘D): View detailed sync status for all books

### Keyboard Shortcuts

- `⌘I` - Incremental sync
- `⌘F` - Full sync  
- `⌘⇧A` - Toggle auto-sync
- `⌘D` - View sync status
- `⌘S` - Sync current book/highlight
- `⌘R` - Refresh
- `⌘⇧R` - Reset sync status

## Auto Sync

Configure automatic syncing in Settings:

- **Enable Auto-sync**: Turn on automatic background sync
- **Sync Interval**: Choose frequency (hourly, daily, weekly)

When enabled, the extension will automatically check for new highlights and sync them to Readwise.

## Troubleshooting

### Authentication Issues

- **WeRead Cookie Invalid**: Ensure you're logged into WeRead and the cookie is fresh
- **Readwise Token Invalid**: Verify your token at readwise.io/access_token
- **Connection Failed**: Check your internet connection

### Sync Issues

- **No New Highlights**: Use "Reset Sync Status" to force a complete re-sync
- **Partial Sync**: Some books may fail individually - check sync status for details
- **Auto-sync Not Working**: Ensure both credentials are configured and auto-sync is enabled

## Privacy

- All data is stored locally on your device
- No data is transmitted to third parties except WeRead and Readwise
- Credentials are stored securely in Raycast's local storage

## License

MIT License