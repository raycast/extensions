# Flickr Uploader

Upload photos to Flickr directly from Raycast with full metadata support, including albums and groups.

## Features

- **Quick Photo Upload**: Upload single photos with title, description, and tags
- **Album Management**: Add photos to existing albums or create new ones
- **Group Posting**: Post photos to multiple Flickr groups simultaneously
- **Privacy Controls**: Set photo visibility (private, public, friends, family)
- **OAuth Authentication**: Secure authentication using OAuth 1.0a
- **Draft Support**: Form drafts prevent loss of metadata during uploads

## Setup

### 1. Create a Flickr App

1. Go to [Flickr App Garden](https://www.flickr.com/services/apps/create/)
2. Click "Request an API Key"
3. Choose "Apply for a Non-Commercial Key" (or Commercial if applicable)
4. Fill in the application details:
   - **App Name**: Choose any name (e.g., "My Raycast Uploader")
   - **App Description**: Brief description of your personal use
   - **App Type**: Select **Desktop Application**
5. Note down your **API Key** and **API Secret**

### 2. Configure the Extension

1. Open Raycast and search for "Upload Photo" or "Setup Flickr"
2. Open Extension Preferences (or use the action in Setup Flickr)
3. Enter your **Flickr API Key** and **Flickr API Secret**

### 3. Authenticate with Flickr

1. Open the "Setup Flickr" command
2. Press `⌘↵` to open the Flickr authorization page
3. Approve the app in your browser
4. Copy the verification code from Flickr
5. Paste it into the OAuth Verifier field in Raycast
6. Press `⌘↵` to complete the login

## Usage

### Upload a Photo

1. Open the "Upload Photo" command
2. Select an image file
3. Enter photo details:
   - **Title** (required)
   - **Description** (optional)
   - **Tags** (comma-separated, optional)
   - **Visibility** (private, public, friends, family, or friends & family)
4. Optionally select an existing album or create a new one
5. Optionally select groups to post to
6. Press `⌘↵` to upload

### Switch Accounts

1. Open "Setup Flickr"
2. Use the "Disconnect Flickr" action
3. Follow the authentication steps again with a different account

## Privacy & Security

- API credentials are stored securely in Raycast's encrypted preferences
- OAuth tokens are stored in Raycast's local encrypted storage
- No data is sent to third parties except Flickr
- The extension connects directly to Flickr's API

## Troubleshooting

### "OAuth signature invalid" error
- Ensure your API Key and Secret are correct in Extension Preferences
- Try disconnecting and reconnecting your Flickr account

### Groups posting fails
- Some groups require moderation before photos appear
- Check that you're a member of the groups you're posting to
- Group rules may restrict certain content types

### Photo upload fails
- Check your internet connection
- Ensure the image file is a valid format (JPEG, PNG, GIF)
- Verify your Flickr account has sufficient storage

## Credits

Built with the [Raycast API](https://developers.raycast.com).

## License

MIT
