# Google Chat

Search spaces and direct messages, and read and reply to messages in Google Chat from Raycast.

The Google Chat API only works for **Google Workspace** (Business or Enterprise) accounts. Personal `@gmail.com` accounts can't use it.

## Setup

Google doesn't provide a shared sign-in for the Chat API, so you create your own OAuth client once (about 20 minutes). Do this while signed in with your Workspace account.

1. Go to [console.cloud.google.com](https://console.cloud.google.com), pick your organization, and create a project (for example `raycast-google-chat`).
2. Under **APIs & Services → Library**, enable the **Google Chat API** and the **People API**.
3. Under **Google Chat API → Configuration**, fill in an app name, an avatar URL and a description. Leave interactive features off. Sending messages, reactions and creating DMs fail with "Chat app not found" until this page is saved.
4. Under **Google Auth Platform → Branding/Audience** (the OAuth consent screen), choose:
   - **Internal** if only people in your Workspace will use it. Internal apps don't need Google verification.
   - **External**, then **Publish app** (In production), if you must. Reading messages uses the restricted `chat.messages.readonly` scope, so an external app in Testing mode expires sign-ins after 7 days, and a public one needs Google verification.
5. Under **Data Access**, add these scopes:
   - `chat.spaces.readonly`, `chat.spaces.create`
   - `chat.messages.readonly`, `chat.messages.create`, `chat.messages.reactions`
   - `chat.memberships.readonly`, `chat.users.readstate`
   - `directory.readonly`, `userinfo.email`, `userinfo.profile`, `openid`
6. Under **Clients → Create client**, choose application type **iOS** and enter bundle ID `com.raycast`. The iOS type lets Raycast sign in with PKCE and no client secret.
7. Copy the client ID (`…apps.googleusercontent.com`) into the extension's **Google OAuth Client ID** preference. The first command you open asks you to sign in.

If your Workspace admin restricts third-party apps under **Security → API controls**, ask them to mark the client ID as trusted.

## Commands

| Command             | What it does                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search Spaces & DMs | Your spaces, group chats and DMs in sections, most-used first. View messages, open in Google Chat, copy the link. Filter by type with the dropdown. |
| Find Person         | Search your organization's directory, then open a DM or copy the email.                                                                             |

In message lists you can reply in a thread, add a reaction, copy the text or the message link, and open the message in Google Chat.

### Preferences

- **Google OAuth Client ID** (required): the iOS client from Setup.
- **Open With**: browser or installed Chat web app for every "Open in Google Chat" action. Empty uses your default browser.

## Limits

- **No presence or status.** The API only exposes your own availability, not other people's, so there is no "online" indicator.
- **Names.** Chat doesn't always return names for people outside your shared spaces; the extension then looks them up in your directory and caches them.
- **Text only.** Messages are sent as text with Chat formatting (`*bold*`, `_italic_`, `~strike~`, `` `code` ``). Attachments and cards aren't supported.
