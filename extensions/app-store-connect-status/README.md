# App Store Connect Status

View the status of your apps in App Store Connect directly from Raycast.

![Extension Screenshot](metadata/image1.png)

## Features

- **View all your apps** with their current App Store status
- **Filter by status** - quickly find apps that are In Review, Ready for Sale, Rejected, etc.
- **Detailed view** - see version info, creation date, platform, and release type
- **Quick actions** - open in App Store Connect, copy Bundle ID, copy App ID

## Status Indicators

| Status | Emoji | Description |
|--------|-------|-------------|
| Ready for Sale | ✅ | App is live on the App Store |
| In Review | 👀 | App is being reviewed by Apple |
| Waiting for Review | ⏳ | App is in the review queue |
| Pending Developer Release | 🚀 | Approved, waiting for you to release |
| Pending Apple Release | 🍎 | Approved, waiting for Apple to release |
| Prepare for Submission | ✏️ | Draft version not yet submitted |
| Rejected | ❌ | App was rejected by App Review |

## Setup

### 1. Create an App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access** → **Integrations** → **App Store Connect API**
3. Click the **+** button to create a new key
4. Give it a name and select the appropriate role (e.g., "Admin" or "App Manager")
5. Click **Generate**
6. **Download the API Key** (.p8 file) - you can only download it once!
7. Note down the **Key ID** and **Issuer ID**

### 2. Configure the Extension

1. Open Raycast and search for "View App Status"
2. You'll be prompted to enter your credentials:
   - **Issuer ID**: The UUID shown at the top of the API Keys page
   - **API Key ID**: The Key ID of your generated key
   - **Private Key**: Open the .p8 file in a text editor and paste the entire content

## Usage

### View Apps
Simply open the command to see all your apps with their current status.

### Filter Apps
Press `Cmd+K` to open the action menu and select a status filter:
- All Apps
- Ready for Sale
- In Review
- Waiting for Review
- Pending Developer Release
- Prepare for Submission
- Rejected

### View Details
Press `Enter` on any app to see detailed information including:
- Version number
- Status with emoji
- Platform (iOS, macOS, tvOS, visionOS)
- Creation date
- Release type

### Quick Actions
- `Enter` - View app details
- `Cmd+K` - Open action menu (filter, refresh, copy)
- `Cmd+.` - Copy Bundle ID
- `Cmd+Shift+.` - Copy App ID
- `Cmd+R` - Refresh list

## Troubleshooting

### "Authentication failed"
- Double-check your Issuer ID and API Key ID
- Make sure you pasted the complete private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

### "Access denied"
- Your API key may not have sufficient permissions
- Create a new key with "Admin" or "App Manager" role

### "Rate limit exceeded"
- Wait a few seconds and try again
- The App Store Connect API has rate limits

## Privacy

This extension connects directly to the App Store Connect API. Your credentials are stored locally in Raycast's secure preferences and are never sent to any third-party servers.

## Author

**Danilo Requena** - [@danilorequena](https://github.com/danilorequena)

## License

MIT
