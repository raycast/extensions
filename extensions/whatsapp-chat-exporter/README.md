# WhatsApp Chat Exporter

Export your WhatsApp chats to JSON or Markdown format with media files included.

## Features

- 📱 **Export Individual or All Chats**: Choose to export a specific chat or all your WhatsApp conversations at once
- 📝 **Multiple Formats**: Export to JSON (structured data) or Markdown (human-readable)
- 🖼️ **Media Support**: Optionally include images, videos, documents, and other media files in your exports
- 👥 **Group Chat Support**: Properly identifies individual senders in group conversations
- 🔒 **Privacy First**: All processing happens locally on your Mac - no data is sent to external servers

## Requirements

- macOS with WhatsApp desktop app installed
- **Full Disk Access** for Raycast (required to read WhatsApp database)

## Setup

### Grant Full Disk Access to Raycast

This extension needs to read WhatsApp's local database to export your chats.

1. Open **System Settings** → **Privacy & Security** → **Full Disk Access**
2. Click the **+** button
3. Navigate to **Applications** and select **Raycast**
4. Toggle Raycast to enable Full Disk Access
5. Restart Raycast

## Usage

1. Open Raycast (⌘ + Space)
2. Search for **"Export WhatsApp Chats"**
3. Select options:
   - **Chat Selection**: Choose a specific chat or "All Chats"
   - **Destination Folder**: Where to save the exported files (default: `~/Desktop/WhatsApp-Exports`)
   - **Export Format**: JSON or Markdown
   - **Include Media Files**: Toggle to copy images, videos, and documents
4. Press **Enter** to start the export

## Export Formats

### JSON Format
Structured data format perfect for programmatic access or AI processing:
```json
{
  "chat": {
    "name": "John Doe",
    "exportedAt": "2026-01-26T12:00:00.000Z"
  },
  "messages": [
    {
      "date": "2026-01-25T10:30:00.000Z",
      "sender": "John Doe",
      "text": "Hello!",
      "hasMedia": false
    }
  ]
}
```

### Markdown Format
Human-readable format with proper formatting:
```markdown
# Chat with John Doe

*Exported on 1/26/2026, 12:00:00 PM*

**John Doe** [1/25/2026, 10:30:00 AM]:
Hello!

**Me** [1/25/2026, 10:31:00 AM]:
Hi there!
```

## Media Export

When "Include Media Files" is enabled:
- Media files are copied to a `{ChatName}_media/` folder
- JSON exports include file metadata (size, type, duration for videos/audio)
- Markdown exports include clickable links and embedded images
- Only locally downloaded media is copied (cloud-only files are marked as unavailable)

## Output Structure

```
~/Desktop/WhatsApp-Exports/
├── WhatsApp_Chat_John_Doe_1234567890.json
├── John_Doe_media/
│   ├── image_uuid1.jpg
│   ├── video_uuid2.mp4
│   └── document_uuid3.pdf
└── WhatsApp_Chat_Jane_Smith_1234567891.md
```

## Troubleshooting

### "Database Error" - Full Disk Access Required
Make sure Raycast has Full Disk Access enabled in System Settings. Restart Raycast after granting permission.

### No Chats Appear in Dropdown
Ensure WhatsApp desktop app is installed and you've logged in at least once.

### Media Files Not Exported
Only media that has been downloaded locally will be exported. Cloud-only media will be marked as unavailable in the export.

### Sender Names Show as Phone Numbers
This can happen for contacts not saved in your phone. The extension will show WhatsApp display names when available.

## Privacy & Security

- All data processing happens **locally** on your Mac
- No data is sent to external servers
- Database is accessed in **read-only** mode
- Original WhatsApp data is never modified

## License

MIT

## Support

If you encounter any issues or have feature requests, please open an issue on the [GitHub repository](https://github.com/IamMohitm/whatsapp-raycast-exporter).
