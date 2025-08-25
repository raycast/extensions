# OpenProject Raycast Extension

An **unofficial** Raycast extension for managing your OpenProject tickets directly from Raycast.

**⚠️ Important Notice**: This extension is **not officially** developed or supported by OpenProject GmbH. This is a community project that uses the public OpenProject API.

## Features

- Create Tickets: Create new tickets with all essential fields
- Search Tickets: Search through your tickets by title
- Update Tickets: Edit existing tickets with a two-step process
- Project Integration: Work with all your OpenProject projects
- User Assignment: Assign tickets directly to team members
- Priority Management: Set and update ticket priorities
- Status Updates: Change ticket status (New → In Progress → Closed, etc.)

## Installation

1. Clone this repository or create the files manually
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your OpenProject connection in Raycast Preferences:
   - **OpenProject URL**: Your OpenProject instance URL (e.g., `https://community.openproject.org`)
   - **API Key**: Your OpenProject API key

## Creating an API Key

1. Log into your OpenProject instance
2. Go to **My Account** → **Access Tokens**
3. Click **+ Access Tokens**
4. Enter a name (e.g., "Raycast Extension")
5. Copy the generated API key
6. Paste it into the Raycast preferences

## Commands

### Create Ticket
Create a new ticket with the following options:
- **Subject**: Ticket title (required)
- **Description**: Ticket description (optional)
- **Project**: Select project (required)
- **Type**: Ticket type (Bug, Feature, Task, etc.)
- **Assignee**: Assigned person (optional)
- **Priority**: Priority level (optional)

### Search Tickets
Search through your tickets:
- Live search as you type
- Shows ticket ID, title, project, and status
- Direct link to ticket in OpenProject
- Copy ticket URL or ID to clipboard

### Update Ticket
Update existing tickets with a two-step process:
1. **Search Mode**: Find the ticket you want to edit
2. **Edit Mode**: Update all ticket properties
- Modify subject and description
- Change assignee, priority, and status
- Pre-filled forms with current values
- Only sends changed fields to API

## Development

```bash
# Start development server
npm run dev

# Build extension
npm run build

# Linting
npm run lint
npm run fix-lint
```

## Project Structure

```
src/
├── api.ts              # OpenProject API client
├── create-ticket.tsx   # Create ticket command
└── update-ticket.tsx   # Update ticket command
```

## Requirements

- Node.js 18+
- Raycast 1.62.0+
- OpenProject instance with API access

## Troubleshooting

### Connection Errors
- Check your OpenProject URL (without trailing slash)
- Ensure your API key is correct
- Test the connection in browser: `https://your-instance.openproject.org/api/v3/`

### No Projects/Types Visible
- Check your permissions in OpenProject
- Ensure you have at least "View work packages" permissions

### Performance
- Search uses debouncing (500ms delay)
- Large instances may have longer loading times

### API Errors
- **409 Conflict**: Ticket was modified by someone else - select ticket again
- **422 Invalid Data**: Check all form fields are filled correctly
- **403 Forbidden**: Check API key and permissions

## Features in Detail

### Smart Search
- Real-time search with 500ms debouncing
- Color-coded status tags
- Formatted dates and project information
- Quick actions for opening and copying

### Intelligent Updates
- Two-step process prevents accidental edits
- Pre-filled forms with current values
- Only changed fields are sent to API
- Conflict detection and recovery

### Error Handling
- Comprehensive error messages
- User-friendly recovery suggestions
- Automatic retry mechanisms
- Debug logging for troubleshooting

## License

MIT License

## Disclaimer

This extension is an **unofficial community project** and is not developed, sponsored, or supported by OpenProject GmbH. OpenProject® is a registered trademark of OpenProject GmbH.

The extension exclusively uses the public OpenProject REST API and follows its terms of service.

**Support**: For issues with this extension, please create an issue in this repository. Do **not** contact official OpenProject support for problems with this extension.

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.
