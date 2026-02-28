# tl;dv Raycast Extension

Access your tl;dv meeting recordings directly from Raycast.

## Features

- View recent meeting recordings
- Quick access to meeting details
- Direct links to open recordings in tl;dv

## Setup

### Prerequisites

- A tl;dv account (Business Plan required for API access)
- API key from your tl;dv account settings

### Getting Your API Key

1. Log in to your tl;dv account
2. Navigate to Settings → Personal Settings → API Keys
3. Generate a new API key
4. Copy the API key

### Configuration

1. Install the extension in Raycast
2. Open the extension preferences
3. Enter your tl;dv API key
4. (Optional) Customize the API URL if using a custom instance

## Usage

### View Recent Recordings

Use the "Recent Recordings" command to see your latest meeting recordings. Each recording shows:
- Meeting title
- Date and duration
- Participants
- Quick actions to open in tl;dv

## Mock Data Mode

If you don't have a Business Plan or want to test the extension, it will automatically use mock data when no API key is provided.

## Known Limitations

- The meetings available through the API depend on the sharing permissions of the API key owner
- You will only see meetings that have been shared with the account that generated the API key
- Access to meetings is controlled by the organization's sharing settings and user permissions

## Support

For issues or questions, please visit the [GitHub repository](https://github.com/raycast/extensions).

## License

MIT