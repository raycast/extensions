# 42 API

Track your 42 logtime and find peers in the clusters directly from Raycast.

## Setup

To use this extension, you need to provide your own 42 API credentials.

### How to get your Client ID and Secret

1. Go to [42 Intranet Applications](https://profile.intra.42.fr/oauth/applications).
2. Click **New Application**.
3. Fill in the form:
   - **Name**: Raycast (or any name you prefer)
   - **Redirect URI**: `http://localhost` (This is required by the form but not used by the extension)
   - **Scopes**: Select `public` and `profile`
4. Click **Submit** to create the application.
5. On the application page, you will find your credentials:
   - Copy the **UID** and paste it into the **Client ID** field in the extension preferences.
   - Copy the **Secret** and paste it into the **Client Secret** field in the extension preferences.

*Note: The Client Secret is only shown once when the application is created. If you lose it, you will need to reset it or create a new application.*
