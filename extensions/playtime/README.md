# Playtime

A Raycast extension that allows you to quickly check the total time played of any game in your Steam library.

## Features

- 🔍 Search through your entire Steam library
- ⏱️ View total playtime for each game
- 📊 See recent playtime (last 2 weeks) when available
- 🎮 Quick access to Steam store pages
- ⚡ Fast and lightweight
- 🚀 **Zero setup required** - works automatically if Steam is installed!

## Setup

**Good news: No setup required for most users!** The extension automatically reads playtime data from your local Steam installation.

### Automatic Setup (Recommended)

If you have Steam installed, the extension will:
1. Automatically detect your Steam installation (works on macOS and Windows)
2. Read playtime data from local files
3. Work immediately without any configuration

Just run the "Playtime" command and it should work!

**Supported Platforms:**
- **macOS**: Automatically finds Steam in `~/Library/Application Support/Steam/`
- **Windows**: Automatically finds Steam in common installation locations:
  - `%LOCALAPPDATA%\Steam\`
  - `C:\Program Files (x86)\Steam\`
  - `C:\Program Files\Steam\`

### Manual Setup (Optional)

You only need to configure these if:
- Steam is not installed locally, OR
- You want to use the Steam API instead of local files

#### Option 1: Steam ID Only (For Public Profiles)

If your Steam profile is public, you only need your Steam ID:

1. Find your Steam ID:
   - Go to [steamid.io](https://steamid.io) and enter your Steam profile URL
   - Or check your Steam profile URL: `https://steamcommunity.com/profiles/76561198000000000` (the number is your Steam ID)
   - Or in Steam: View → Settings → Account (shown at bottom)

2. Enter it in Raycast preferences (Extensions → Playtime → Preferences)

#### Option 2: Steam ID + API Key (For Private Profiles)

If your Steam profile is private, you'll need both:

1. **Get Your Steam API Key:**
   - Go to [Steam Web API Key Registration](https://steamcommunity.com/dev/apikey)
   - Sign in and register for an API key
   - **Domain Name field**: Enter `localhost` or `127.0.0.1` (this is required but can be any value for personal use)
   - Copy the API key

2. **Find Your Steam ID** (see Option 1 above)

3. Enter both in Raycast preferences

## How It Works

The extension tries multiple methods in order:

1. **Local Files (No setup)** - Reads from `~/Library/Application Support/Steam/userdata/`
2. **Steam API (Public profiles)** - Works without API key if profile is public
3. **Steam API (Private profiles)** - Requires API key if profile is private

## Troubleshooting

**"Could not find Steam installation" error:**
- Make sure Steam is installed
- On Windows, ensure Steam is in a standard location (see above)
- Or provide your Steam ID in preferences to use the API method instead

**"Profile is private" error:**
- Set your Steam profile to public, OR
- Add a Steam API key in preferences

**"No games found" error:**
- Make sure you have games in your Steam library
- Try refreshing the library (Cmd+R)
- If using API, ensure your profile privacy allows viewing game details

**Games not showing:**
- Some games may not appear if they have zero playtime
- Free games you've played may not show in local files

## Privacy

- Playtime data is read from your local Steam files (no internet needed for local method)
- Your Steam API key and Steam ID are stored locally in Raycast preferences
- No data is sent to any third-party services
- All API calls go directly to Steam's servers

## License

MIT

