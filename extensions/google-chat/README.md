# Google Chat

Search spaces and direct messages, read and reply to messages, and send messages in Google Chat from Raycast.

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

| Command             | What it does                                                                                                                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search Spaces & DMs | Your spaces, group chats and DMs in sections, most-used first. View messages, send a message, open in Google Chat, copy the link. Filter by type with the dropdown.                                                                                                                                                  |
| Send Message        | One **To** field: search your DMs, spaces and group chats by name, or people in your directory (from 2 letters). Type any email to message someone new. Then pick **Thread**: a new message, one of the recent threads in that conversation, or a pasted thread link. Keeps drafts and remembers the last recipient. |
| Quick Message       | `to` and `message` arguments from root search. `to` is an email, a Chat link, `spaces/…`, or the exact title of a space or DM.                                                                                                                                                                                       |
| Find Person         | Search your organization's directory, then open a DM, send a message, or copy the email.                                                                                                                                                                                                                             |

### Mentions in Send Message

When **To** is a space or group chat, a **Mention** field lists its members (not you) and **@all (everyone in this space)**. For each person you pick:

- If the message has `@` followed by their full or first name (any case, whole word), the first one becomes the mention. A first name shared by two picked people isn't used; type the full name.
- Otherwise the mention goes at the start of the message, in the order you picked.
- `@all` and `@everyone` in the text become the everyone mention the same way.

Text in `` `code` `` and ` ``` ` blocks is left alone, and people already mentioned aren't mentioned twice. A **Preview** under the message shows what will be sent. Changing **To** clears the picked mentions. Mentions use Chat's `<users/{id}>` and `<users/all>` syntax; a space's permission settings can limit who may use `@all`.

In message lists you can reply in a thread, add a reaction, copy the text or the message link, and open the message in Google Chat.

### Preferences

- **Google OAuth Client ID** (required): the iOS client from Setup.
- **Open With**: browser or installed Chat web app for every "Open in Google Chat" action. Empty uses your default browser.

## Limits

- **Threads in DMs.** Google documents replying in a thread for named spaces. In DMs and group chats, Send Message only lists threads that already have replies; if replying isn't possible, the message starts a new thread.
- **No presence or status.** The API only exposes your own availability, not other people's, so there is no "online" indicator.
- **Rate limits.** Google allows 1 message per second per space and 300 searches per minute per project. The extension spaces out sends and retries rate-limited requests up to 3 times.
- **Names.** Chat doesn't always return names for people outside your shared spaces; the extension then looks them up in your directory and caches them.
- **Text only.** Messages are sent as text with Chat formatting (`*bold*`, `_italic_`, `~strike~`, `` `code` ``). Attachments and cards aren't supported.
