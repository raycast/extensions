# Getting a Google Client ID

Follow these steps to get a Google client ID:

## Step 1: Access Google Cloud Console

Navigate to the [Google Cloud Console](https://console.developers.google.com/apis/credentials).

## Step 2: Create a Project (if needed)

1. Click **Create Project**.
2. Provide a **Project Name**.
3. Select an optional **Organization**.
4. Click **Create**.

## Step 3: Enable Required APIs

1. Go to **Enabled APIs & services**.
2. Click **ENABLE APIS AND SERVICES**.
3. Search for and enable the required API (e.g., Google Drive API).

## Step 4: Configure OAuth Consent Screen

1. Click on **OAuth consent screen**.
2. Choose **Internal** or **External** (choose **External** if you intend to publish the extension in the Raycast store).
3. Enter these details:
   - **App name**: Raycast (Your Extension Name)
   - **User support email**: your-email@example.com
   - **Logo**: Paste Raycast's logo over there ([Link to Raycast logo](https://raycastapp.notion.site/Raycast-Press-Kit-ce1ccf8306b14ac8b8d47b3276bf34e0#29cbc2f3841444fdbdcb1fdff2ea2abf))
   - **Application home page**: https://www.raycast.com
   - **Application privacy policy link**: https://www.raycast.com/privacy
   - **Application terms of service link**: https://www.raycast.com/terms-of-service
   - **Authorized domains**: Click **ADD DOMAIN** then add `raycast.com`
   - **Developer contact**: your-email@example.com
4. Add the necessary scopes for your app (visit the [Google OAuth scopes docs](https://developers.google.com/identity/protocols/oauth2/scopes) if you manually need to add scopes)
5. Add your own email as a test user and others if needed
6. Review and go back to the dashboard

## Step 5: Create an OAuth Client ID

1. Go to **Credentials**, click **CREATE CREDENTIALS**, then **OAuth client ID**
2. Choose **iOS** as the application type
3. Set the **Bundle ID** to `com.raycast`.
4. Copy your **Client ID**

## Step 6: Use Your New Client ID 🎉

{% hint style="info" %}
You'll need to publish the app in the **OAuth consent screen** so that everyone can use it (and not only test users). The process can be more or less complex depending on whether you use sensitive or restrictive scopes.
{% endhint %}

