# Weread Sync

Sync your highlights from Weread to Readwise automatically and efficiently.

> Enhanced with improved fetch API and cleaner code structure.

## Features

- **📚 Browse Weread Library**: View all your Weread books with highlights
- **⚡ Quick Sync**: Manual sync individual books or all highlights  
- **🔄 Auto Sync**: Automatically sync new highlights at regular intervals
- **📊 Sync Status**: Detailed sync status tracking with visual indicators
- **🎯 Incremental Sync**: Smart sync that only processes new highlights
- **🔧 Full Sync**: Complete re-sync option when needed
- **⚙️ Native Preferences**: Built-in Raycast preferences for easy configuration

## Setup

### Prerequisites

1. **Weread Account**: Active account with highlighted books
2. **Readwise Account**: Account with API access

### Configuration

1. Install the extension from Raycast Store
2. Open Raycast preferences (`⌘,`) 
3. Navigate to Extensions → Weread Sync
4. Configure the required settings:

#### Weread Cookie
1. Open [Weread](https://weread.qq.com) in your browser
2. Login to your account
3. Open Developer Tools (F12)
4. Go to the Network tab
5. Refresh the page
6. Find any request and copy the `Cookie` header value
7. Paste it in the Weread Cookie preference field

#### Readwise Access Token
1. Go to [readwise.io/access_token](https://readwise.io/access_token)
2. Login to your account
3. Copy your access token
4. Paste it in the Readwise Access Token preference field

#### Auto-Sync Settings (Optional)
- **Enable Auto-sync**: Turn on automatic background sync
- **Sync Interval**: Choose frequency (hourly, daily, weekly)

## Usage

### Command

- **Weread Sync**: Access your library, sync highlights, and manage sync operations

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

Configure automatic syncing in Raycast preferences:

- **Enable Auto-sync**: Turn on automatic background sync
- **Sync Interval**: Choose frequency (hourly, daily, weekly)

When enabled, the extension will automatically check for new highlights and sync them to Readwise when you use the extension.

## Sync Status

The extension provides detailed sync status information:

- **Green Checkmark**: All highlights are synced
- **Orange Clock**: Book has been synced before but has new highlights
- **Red Exclamation**: Book has never been synced
- **Blue Upload**: New highlights ready to sync

View the sync status page to see:
- Total books with highlights
- Number of new highlights per book
- Last sync timestamp for each book
- Individual book sync operations

## Troubleshooting

### Authentication Issues

- **Weread Cookie Invalid**: Ensure you're logged into Weread and the cookie is fresh
- **Readwise Token Invalid**: Verify your token at readwise.io/access_token
- **Connection Failed**: Check your internet connection
- **Missing Preferences**: Configure credentials in Raycast preferences (`⌘,`)

### Sync Issues

- **No New Highlights**: Use "Reset Sync Status" to force a complete re-sync
- **Partial Sync**: Some books may fail individually - check sync status for details
- **Auto-sync Not Working**: Ensure both credentials are configured and auto-sync is enabled in preferences

### First Time Setup

If you see "Authentication Required":
1. Press `⌘,` to open Raycast preferences
2. Navigate to Extensions → Weread Sync
3. Fill in your Weread Cookie and Readwise Access Token
4. Restart the command

## Privacy & Security

- All credentials are stored securely in Raycast's preferences system
- Sync status is stored locally on your device
- No data is transmitted to third parties except Weread and Readwise APIs
- The extension only accesses your highlighted books and notes

## Technical Details

- **Incremental Sync**: Tracks which highlights have been synced to avoid duplicates
- **Batch Processing**: Efficiently processes multiple books and highlights
- **Error Handling**: Graceful handling of network issues and API errors
- **Auto-Sync**: Respects Raycast guidelines - only syncs when extension is actively used

## License

MIT License