# How to Set Up Google Meet Integration

## Quick Start

**Good news!** Google Meet works out of the box for most users. The extension uses a shared OAuth client, so you typically don't need to configure anything.

## When You Need Your Own OAuth Credentials

You only need to set up your own Google OAuth credentials if:
- The shared client isn't working for you
- You want to use your own Google Cloud project
- You're deploying this extension yourself

## Setup Steps (Optional)

1. **Create a Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Click "New Project" or select an existing project
   - Give it a name (e.g., "Hang Extension")

2. **Enable Google Calendar API**
   - In your project, go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create OAuth Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - Choose "External" (unless you have a Google Workspace account)
     - Fill in the required fields (App name, User support email, Developer contact)
     - Add scopes: `https://www.googleapis.com/auth/calendar.events`
     - Add test users if needed (for testing before verification)
   - For Application type, select "Web application"
   - Add authorized redirect URIs:
     - `https://raycast.com/redirect`
   - Click "Create"
   - Copy your **Client ID** and **Client Secret**

4. **Add to Extension**
   - Raycast → Extensions → Hang → Preferences
   - Enter your **Google OAuth Client ID** in the "Google OAuth Client ID" field
   - Enter your **Google OAuth Client Secret** in the "Google OAuth Client Secret" field
   - Or add to `.env` file (development only):
     ```
     GOOGLE_CLIENT_ID=your-client-id
     GOOGLE_CLIENT_SECRET=your-client-secret
     ```

5. **First-Time Authorization**
   - When you first run the extension, it will open your browser
   - Sign in with your Google account
   - Grant permission to create calendar events
   - You'll be redirected back to Raycast
   - The extension will remember your authorization

## How It Works

The extension creates a temporary Google Calendar event with a Google Meet link, then immediately deletes the event. This gives you a valid Meet link without cluttering your calendar.

## Notes

- The extension needs permission to create and delete calendar events
- Your Google account must have Calendar access enabled
- The OAuth token is stored securely by Raycast
- You can revoke access anytime in your [Google Account settings](https://myaccount.google.com/permissions)

## Troubleshooting

**"Redirect URI mismatch" error:**
- Make sure `https://raycast.com/redirect` is added to your OAuth client's authorized redirect URIs

**"Access denied" error:**
- Check that you've enabled the Google Calendar API
- Verify the OAuth consent screen is configured
- Make sure you're using a test user account if your app is in testing mode

**"Invalid client secret" error:**
- Double-check that your Client ID and Client Secret are correct
- Ensure there are no extra spaces when copying credentials

