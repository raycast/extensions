<div align="center">
  <img
    src="./assets/teams-logo.png"
    width="100"
  />
  <h1>
    Microsoft Teams
  </h1>
Easily manage your presence and status message with this extension. Search chats and people, open conversations, and prepare audio or video calls in Teams on macOS and Windows.
<p>
    <a href="https://www.raycast.com/sven/microsoft-teams">
      <img src="https://img.shields.io/badge/Raycast-Store-red.svg"
        alt="Find this extension on the Raycast store"
      />
    </a>
    <img
      src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
      alt="PRs welcome!"
    />
    <a href="https://github.dev/raycast/extensions/extensions/microsoft-teams">
      <img src="https://img.shields.io/badge/Open_in-GitHub.dev-red.svg"
        alt="Open in GitHub.dev"
      />
    </a>
  </p>
</div>

![Screenshot of the "set presence" command](metadata/microsoft-teams-1.png)
![Screenshot of the "set status" command](metadata/microsoft-teams-2.png)
![Screenshot of the "find chat" command](metadata/microsoft-teams-3.png)
![Screenshot of the "find user" command](metadata/microsoft-teams-4.png)

These features are currently available:

- Set your presence
- View presence of other users
- Set your status
- Find chats by name or member and open them in Teams
- Find people by name or email and open a chat
- Call a user directly with audio or video
- Use Raycast AI to search people and chats, check or update presence, and manage your status message
- Read recent chat messages and create new-chat or call links with Raycast AI

## Raycast AI

Mention `@microsoft-teams` in Raycast AI to use the extension's tools. For example:

- `@microsoft-teams find Alex Morgan`
- `@microsoft-teams what is Alex Morgan's Teams presence?`
- `@microsoft-teams find my Design Systems chat`
- `@microsoft-teams summarize the latest messages in my Design Systems chat`
- `@microsoft-teams show my five most recent chats`
- `@microsoft-teams create a video-call link for Alex Morgan`
- `@microsoft-teams set my Teams presence to busy`
- `@microsoft-teams set my Teams status to Focus time`

Changes to your presence or status message require confirmation before they are applied.

## Setup

When starting the extension for the first time it will ask you for two IDs: The **Application ID** and the **Directory ID**. Your organization's Microsoft admin should be able to provide you these IDs after following the admin setup guide provided below. After you've entered them you'll be able to login with your Microsoft account.

The extension authenticates with Microsoft using OAuth 2.0 Authorization Code flow with PKCE. Raycast opens Microsoft's sign-in page and securely stores the resulting tokens; the extension never receives or stores your Microsoft password. The same OAuth flow is used on macOS and Windows.

When **Open in** is set to **Desktop App**, Teams deep links open the installed client. When it is set to **Web App**, they open Teams in the browser. Audio and video actions use Microsoft's cross-platform call links and Teams asks for confirmation before placing a call.

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
      - `Chat.Read`
      - `offline_access`
      - `Presence.ReadWrite`
      - `User.Read`
      - `User.Read.All`
      - `Presence.Read.All` - needed for getting the presence of other users
   3. Click the button **Grant admin consent for undefined** to give these permissions to your users in the name of your organization.

      There's nothing to fear here: Even with these permissions, your users will only be able to access things they are allowed to see.

6. That's it! Now navigate to the **Overview** of your app registration and note down the **Application (client) ID** and the **Directory (tenant) ID**. Your users require these two IDs to connect their Raycast with Microsoft Teams.
   ![Screenshot of app registration overview screen with IDs](media/overview-ids.png)

   **Relax:** These two IDs are no secrets and don't provide any access at all when used alone. Each user still additionally needs to authenticate using his/her Microsoft Account. You can easily provide these IDs in your internal documentation.
