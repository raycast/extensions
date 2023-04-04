# Microsoft Teams
With this [Raycast](https://raycast.com/) extension you can control and navigate Microsoft Teams.

![Screenshot of the "set presence" command](metadata/microsoft-teams-1.png)

![Screenshot of the "find chat" command](metadata/microsoft-teams-2.png)

These features are currently available:

- Set your presence
- Find chats by name or member and open them in Teams

## Setup
When starting the extension for the first time it will ask you for two IDs: The **Application ID** and the **Directory ID**. Your organization's Microsoft admin should be able to provide you these IDs after following the admin setup guide provided below. After you've entered them you'll be able to login with your Microsoft account.

## Setup for Admins
Before your users can use this extension, you as a Microsoft admin of your organization has to prepare the connection in the [Azure Portal](https://portal.azure.com/) by creating an app registration. This only has to be performed once for all users of your organization.

These are the steps:

1. Open the [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory**
3. Navigate to **App registrations**
4. Click **+ New registration** in the toolbar
   ![Screenshot of app registration screen](media/register-app.png)
   1. Give the application a **Name** – "Raycast" may be a good choice here
   2. Choose the right option for the **Supported account types** – **Accounts in this organizational directory only** may be the right choice for most organizations.
   3. For the **Redirect URI** choose **Public client/native (mobile & desktop)** and use the redirect URI `https://raycast.com/redirect?packageName=Extension`
   4. Click **Register**
5. In the newly created app registration, navigate to **API permissions**:
   ![Screenshot of API permissions](media/api-permissions.png)
   1. Click **+ Add a permission**, select **Microsoft Graph** → **Delegated permissions**, search for "presence", check `Presence.ReadWrite` and click **Add permissions**.
   2. Repeat the same steps to get this list of permissions:
      - `Channel.ReadBasic.All`
      - `Chat.Read`
      - `offline_access`
      - `Presence.ReadWrite`
      - `User.Read.All`
   3. Click the button **Grant admin consent for undefined** to give these permissions to your users in the name of your organization. 
   
      There's nothing to fear here: Even with these permissions, your users will only be able to access things they are allowed to see.
4. That's it! Now navigate to the **Overview** of your app registration and note down the **Application (client) ID** and the **Directory (tenant) ID**. Your users require these two IDs to connect their Raycast with Microsoft Teams.
   ![Screenshot of app registration overview screen with IDs](media/overview-ids.png)

   **Relax:** These two IDs are no secrets and don't provide any access at all when used alone. Each user still additionally needs to authenticate using his/her Microsoft Account. You can easily provide these IDs in your internal documentation.