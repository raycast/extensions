# NUSMods for Raycast

A Raycast extension to search and explore National University of Singapore (NUS) courses powered by NUSMods API.

## Features

- 🔍 **Quick Search**: Search for NUS modules by code or title
- 📚 **Comprehensive Details**: View detailed course information including:
  - Module descriptions
  - Prerequisites and requirements
  - Timetable schedules
  - Exam dates and durations
  - Weekly workload breakdown
- 💬 **Course Reviews**: View student reviews and comments from Disqus (requires API key)
- 🔗 **Direct Links**: Quick access to NUSMods website for each course
- ⚡ **Real-time Data**: Integration with NUSMods API for up-to-date information

## Setup

### Viewing Course Reviews (Optional)

To view student reviews and comments for courses, you'll need to configure a Disqus API key:

1. **Get a Disqus API Key**:
   - Visit [Disqus API Applications](https://disqus.com/api/applications/register/)
   - Sign in with your Disqus account (or create one if you don't have one)
   - Click **"Register a new application"**
   - Fill in the required fields:
     - **Application Name**: e.g., "NUSMods Raycast Extension"
     - **Description**: e.g., "Personal use for viewing NUSMods reviews"
     - **Website**: You can use `https://nusmods.com` or your personal website
     - **Callback URL**: Leave blank (not required for this extension)
   - Click **"Register my application"**
   - On the **Details** tab, copy your **Public API Key** (also called "API Key")

2. **Configure the Extension**:
   - Open Raycast and search for "NUSMods"
   - Press `⌘` `,` (Command + Comma) to open extension preferences
   - Or go to: Raycast Settings → Extensions → NUSMods → Preferences
   - Paste your Disqus API Key in the **"Disqus API Key"** field
   - The extension will now show a **"View Reviews & Comments"** option (⌘R) when viewing course details

**Note**: The Disqus API key is optional. All other features work without it.

## Credits

- Data provided by [NUSMods](https://nusmods.com)

## License

MIT License