# SiYuan Notes Raycast Extension

A Raycast extension for SiYuan Notes, allowing you to quickly search, create, and manage SiYuan notes within Raycast.

![SiYuan Notes Extension](./icon.png)

## Features

- 🔍 **Search Notes**: Quickly search documents and block content
- 📝 **Create Notes**: Create new documents in specified notebooks
- 📅 **Daily Notes**: Quickly add content to today's daily note
- 📋 **Recent Notes**: View and access recently modified documents
- 🧭 **Note Roaming**: Randomly discover note content with multiple roaming modes
- 📎 **Find Assets**: Quickly find and manage attachment files in SiYuan assets folder
- ⚡ **Quick Add Note**: Quickly add clipboard content to recently edited documents
- 📎 **File Link Support**: Directly open attachments and local files in notes

## Installation and Configuration

1. Install the extension in Raycast
2. Configure the following settings:
   - **SiYuan Server URL**: SiYuan server address (default: http://127.0.0.1:6806)
   - **API Token**: API access token (if authentication is enabled)
   - **Default Notebook ID**: Default notebook ID
   - **Daily Note Path**: Daily note path template (default: Inbox/daily note/{{year}}/{{month}}/{{date}})
     * Format: `NotebookName/DocumentPath`
     * Notebook Name: An existing notebook name in SiYuan (e.g., "Inbox")
     * Document Path: Path within that notebook (e.g., `daily note/{{year}}/{{month}}/{{date}}`)
     * Supported variables: `{{year}}`, `{{month}}`, `{{day}}`, `{{date}}` (YYYY-MM-DD format)
   - **Workspace Path**: SiYuan workspace directory path (e.g., /Users/username/Documents/SiYuan)

## Workspace Path Configuration

To correctly open file links and attachments in notes, please configure the **Workspace Path** setting:

1. Find your SiYuan workspace directory
2. Enter the full path in the extension settings, for example:
   - macOS: `/Users/yourname/Documents/SiYuan`
   - Windows: `C:\Users\yourname\Documents\SiYuan`
   - Linux: `/home/yourname/SiYuan`

Once configured correctly, the extension can:
- Open attachment files directly with the default system app
- Show file location in Finder/file manager
- Properly handle relative path file links

## Usage

### Search Notes
- Use the `Search Notes` command
- Enter keywords to search document titles and content
- Support filtering by path
- View complete content in the details page

### Daily Notes
- Use the `Add to Daily Note` command to quickly add content to today's note
- **Quick add mode**: Directly type `add to daily note` in Raycast, press Tab, then enter content for quick addition
- Support multiple quick templates: Ideas, Tasks, Links, Learning, Work, etc.
- Auto-add timestamp (optional)
- Daily note will be auto-created if it doesn't exist
- Supports Markdown format

### File Link Support

#### Click Links Directly to Open Files
In the note details page Markdown content:
- File links will display as `[Filename 📎](file://path)` format
- **Click links directly** may open files with the default app in some environments
- If direct clicking doesn't work, use the ActionPanel method below

#### Open Files via ActionPanel
If notes contain file links, you can use shortcuts:
- **Cmd+Alt+Number**: Open file with default app (primary method)
- **Cmd+Shift+Opt+Number**: Open using file:// protocol (alternative method)
- **Cmd+Opt+Shift+Number**: Show file in Finder
- **Cmd+Shift+Number**: Open in browser (assets only)

### Debugging File Opening Issues
If files can't be opened, please:
1. Check developer console debug logs
2. Confirm workspace path is configured correctly
3. First try clicking file links directly in Markdown
4. If that doesn't work, use open options in ActionPanel
5. Use "Show in Finder" to verify file exists

### Create Notes
- Use the `Create Note` command
- Select notebook and enter title
- Optionally use templates

### Recent Notes
- Use the `Recent Notes` command
- View recently accessed documents
- Quick access and view details

### Note Roaming
- Use the `Note Roaming` command to start your note exploration journey
- **Random Document Roaming**: Randomly discover your document content
- **Random Block Roaming**: Randomly browse block-level content, discover forgotten fragments
- **Old Notes Review**: Rediscover past notes
  - Support filtering by month or year (e.g., 6 months ago, 1 year ago notes)
  - Help review and organize historical content
- **Tag Theme Roaming**: Explore related content by specific tags
- **Document Block Roaming**: Randomly browse block content within specified documents

### Find Assets
- Use the `Find Assets` command to quickly find attachment files
- **File Search**: Quickly search files in the assets folder by filename
- **Type Filter**: Filter by file type (images, documents, audio, video, etc.)
- **File Operations**:
  - Open file with default app
  - Show file location in Finder
  - Copy file path to clipboard
- **Real-time Search**: Filter results in real-time as you type for efficient searching

### Quick Add Note
- Use the `Quick Add Note` command to quickly add content
- **Auto Clipboard**: Automatically get clipboard content as default input
- **Document Selection**: Choose from recently edited documents
- **Timestamp Option**: Optional timestamp addition
- **Quick Mode**: Support passing content parameter directly, suitable for script calls

## Troubleshooting

If you encounter issues, please check:

1. Is SiYuan running
2. Is the API address correct
3. Is the workspace path configured correctly
4. Is the network connection normal

You can use the "Test Connection" feature in the search page to verify configuration.

## Technical Support

For help or to report issues, please check the project documentation or contact the developer.
