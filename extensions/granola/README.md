# Granola

Create, manage, and review notes in [Granola](https://www.granola.ai/). Use the `@granola` AI extension to ask questions about your notes, or trigger other AI tasks, for example:
> create a list of tasks for me in @todoist based on my last meeting in @granola

## Getting started
So long as you have Granola installed and running, and you are logged in, you can use this extension right away.

If you run into any issues, please verify the following:
- You must have Granola app installed and running
- You must be logged into the Granola app
- Raycast must have access to your `~/Library/Application Support/Granola` folder (macOS) or `%APPDATA%\Granola` folder (Windows)

## Granola Commands
- **Create Note** - Start a new note and recording immediately in Granola
- **Search Notes** - View your notes in a list, see their details (including transcript), copy their links, or copy their contents as HTML or Markdown
- **Browse Folders** - Navigate your folders and view notes within them with folder icons
- **Export Transcripts** - Select multiple notes and export their transcripts in bulk
- **Export Notes** - Select multiple notes and export them in bulk
- **Create Note from Transcript** - Create a new note from text transcripts or YouTube videos with AI-powered summaries

## AI Tools
- **AI Notes** - Use Raycast AI on top of Granola and other AI extensions
- **Get Transcript** - Retrieve the full transcript for any specific note
- **Save to Notion** - Export one or more notes to Notion

## Features
- **YouTube Integration** - Extract transcripts directly from YouTube URLs
- **Folder Organization** - Browse and filter notes by folders with visual icons
- **Batch Operations** - Process multiple notes simultaneously
- **Cross-platform Support** - Works on both macOS and Windows
- **Notion Export** - Save notes and transcripts to Notion with one click

## Developer Notes / Privacy
*How does this extension work?*
This extension reads local data from your `~/Library/Application Support/Granola` folder (macOS) or `%APPDATA%\Granola` folder (Windows). It also grabs your Granola API `access_token` from the same folder using WorkOS authentication tokens. When pulling AI notes, this extension uses that token to make API calls to the private Granola API on your behalf; same as if you were opening the note directly in the Granola app. This `access_token` changes periodically so pulling it dynamically this way will keep the extension working. If not, you may need to launch Granola and re-sign in if your session has expired.

*What data does this extension collect?*
This extension does not collect any data. It only reads data from your local Granola app data, or directly from the Granola API, the same way the Granola app does behind the scenes.

## Support
This plugin is an independent project and is not affiliated with, endorsed by, or in any way officially connected to Granola Inc. All trademarks and copyrights related to Granola and Granola AI are the property of their respective owners.