# Telegram

A Raycast extension for viewing and sending messages to your Telegram Saved Messages.

## Features

- 📥 **View Saved Messages**: Browse your Telegram saved messages directly in Raycast
- 📤 **Send to Saved Messages**: Quickly send notes and messages to yourself
- 🔐 **Secure Authentication**: Uses official Telegram API with session persistence

## Setup

### 1. Get Telegram API Credentials

Before using this extension, you need to obtain API credentials from Telegram:

1. Go to [https://my.telegram.org/apps](https://my.telegram.org/apps)
2. Log in with your phone number
3. Click on "API development tools"
4. Fill in the application details:
   - **App title**: Can be anything (e.g., "Raycast Telegram")
   - **Short name**: Can be anything (e.g., "raycast")
   - **Platform**: Choose any platform
5. Click "Create application"
6. You'll receive:
   - **api_id**: A numeric ID (e.g., 12345678)
   - **api_hash**: A 32-character hash (e.g., abcdef1234567890abcdef1234567890)

⚠️ **Important**: Keep these credentials private. Do not share them with anyone.

### 2. Configure the Extension

1. Open Raycast preferences (⌘ + ,)
2. Navigate to Extensions → Telegram
3. Enter your credentials:
   - **API ID**: The numeric ID from step 1
   - **API Hash**: The 32-character hash from step 1
   - **Phone Number**: Your phone number with country code (e.g., +1234567890)

### 3. Authenticate

1. Run the "Authenticate with Telegram" command in Raycast
2. Click "Send Verification Code"
3. Check your Telegram app for the verification code
4. Enter the code in Raycast
5. You're all set! 🎉

The extension will remember your session, so you only need to authenticate once.

## Commands

### Authenticate with Telegram

Log in to your Telegram account. You'll need to do this once before using the other commands.

### View Saved Messages

Browse your Telegram saved messages in a list view. Features:
- Search through your messages
- See message timestamps
- Copy messages to clipboard
- Refresh the list (⌘ + R)

### Send to Saved Messages

Quickly send a message to your Telegram saved messages. Perfect for:
- Saving quick notes
- Storing links for later
- Sending reminders to yourself

## Privacy & Security

- Your API credentials are stored securely in Raycast preferences
- Your session is stored locally using Raycast's LocalStorage API
- No data is sent to any third-party servers
- The extension connects directly to Telegram's servers

## Troubleshooting

### "Not Authenticated" Error

If you see this error, run the "Authenticate with Telegram" command to log in.

### "Invalid API ID" Error

Make sure you've entered the correct API ID and API Hash in the extension preferences. The API ID should be a number, not a string.

### "Failed to Load Messages" Error

This usually means your session has expired. Try running the "Authenticate with Telegram" command again.

## Future Features

Coming soon:
- View all chats
- Send messages to other users and groups
- Media support (photos, files)
- Message search
- Notifications

## License

MIT
