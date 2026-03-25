# Telegram

A Raycast extension for browsing chats, reading messages, and sending messages to your Telegram contacts and groups directly from Raycast.

## Features

- 💬 **Browse Chats**: Browse all your Telegram chats and groups
- 📨 **Send Messages**: Send messages (and files) to any chat or group
- 📥 **View Saved Messages**: Browse your Telegram saved messages directly in Raycast
- 📤 **Send to Saved Messages**: Quickly send notes and messages to yourself
- 🔐 **Secure Authentication**: Uses official Telegram API with session persistence and 2FA support
- 🔄 **Reset Session**: Recover from broken authentication states with one command

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
5. **If you have Two-Factor Authentication (2FA) enabled**, you will be prompted to enter your 2FA password after the code step
6. You're all set! 🎉

The extension will remember your session, so you only need to authenticate once.

## Commands

### Authenticate with Telegram

Log in to your Telegram account. You'll need to do this once before using the other commands. Supports accounts with Two-Factor Authentication (2FA) enabled.

### Browse Chats

Browse all your Telegram private chats and groups in a list view. Features:

- See chat titles, types, and last messages
- Open a chat to view its message history

### Send Message

Send a message to any Telegram chat or group. Features:

- Search for a chat by name
- Attach files from your clipboard

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

### Reset Telegram Session

Clear all stored authentication data to recover from a broken or stuck login state. Use this command if:

- Authentication keeps failing after entering a correct code
- You are stuck in a loop and cannot complete login
- You want to log in with a different account

After resetting, run "Authenticate with Telegram" to log in again.

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

### "Verification code has expired" Error

Verification codes expire quickly. Click "Send Verification Code" again to request a fresh code and enter it promptly.

### Stuck or broken authentication state

Run the "Reset Telegram Session" command to clear all stored state, then run "Authenticate with Telegram" again.

### 2FA / Two-Factor Authentication

If your Telegram account has 2FA enabled, you will see a password prompt automatically after entering your verification code. Enter your Telegram cloud password to complete authentication.

## License

MIT
