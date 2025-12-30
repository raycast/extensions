# How to Set Up Zoom Integration

## Quick Steps

1. **Create a Zoom App**
   - Go to https://marketplace.zoom.us/develop/create
   - Select **"Server-to-Server OAuth"**
   - Fill in app details and create

2. **Add Scopes**
   - Go to **"Scopes"** tab
   - For Server-to-Server OAuth apps, add: `meeting:write:admin`
     - This allows creating meetings at the account level
     - If you see multiple `meeting:write:*` options, choose `meeting:write:admin` for account-level access
   - Click **"Save"**

3. **Activate App**
   - Go to **"Activation"** tab
   - Toggle **"Activate your app"** ON
   - Click **"Save"**

4. **Get Your Credentials**
   - Go to **"App Credentials"** tab (or **"Information"** tab)
   - Copy your **Account ID**, **Client ID**, and **Client Secret**
   - Keep these secure - especially the Client Secret!

5. **Add to Extension**
   - Raycast → Extensions → Hang → Preferences
   - Enter your **Zoom Account ID** in the "Zoom Account ID" field
   - Enter your **Zoom Client ID** in the "Zoom Client ID" field
   - Enter your **Zoom Client Secret** in the "Zoom Client Secret" field
   - Or add to `.env` file (development only):
     ```
     ZOOM_ACCOUNT_ID=your-account-id
     ZOOM_CLIENT_ID=your-client-id
     ZOOM_CLIENT_SECRET=your-client-secret
     ```

## How It Works

The extension automatically generates access tokens using your credentials via Zoom's Server-to-Server OAuth flow. You don't need to manually generate tokens - the extension handles this for you.

## Notes

- Server-to-Server OAuth tokens are generated automatically when needed
- Keep your Client Secret secure - never share it publicly
- The credentials grant permissions to create meetings on your account

