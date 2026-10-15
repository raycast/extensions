# Google Chat

Search spaces and direct messages, read and reply to messages, see your unread chats, and send messages in Google Chat from Raycast.

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
| Search Spaces & DMs | Your spaces, group chats and DMs in sections, most-used first. View messages, send a message, open in Google Chat, copy the link, mark as read. Filter by type with the dropdown.                                                                                                                                    |
| My Messages         | Your conversations like Google Chat's Home: **Unread** first, then **Read** by latest activity, each with the latest message from someone else. Switch between All and Unread Only with the dropdown or ⌘U. See [My Messages](#my-messages).                                                                         |
| Unread Chat         | Your unread total in root search (`12 unread · 4 spaces · 2 mentions`), refreshed every 5 minutes. Opens the conversation when only one is unread, else My Messages' unread view. See [Unread Chat](#unread-chat).                                                                                                   |
| Send Message        | One **To** field: search your DMs, spaces and group chats by name, or people in your directory (from 2 letters). Type any email to message someone new. Then pick **Thread**: a new message, one of the recent threads in that conversation, or a pasted thread link. Keeps drafts and remembers the last recipient. |
| Quick Message       | `to` and `message` arguments from root search. `to` is an email, a Chat link, `spaces/…`, or the exact title of a space or DM.                                                                                                                                                                                       |
| Search Messages     | Keyword search across all conversations, filtered by All, Unread, Mentions Me or Has Link.                                                                                                                                                                                                                           |
| Find Person         | Search your organization's directory, then open a DM, send a message, or copy the email.                                                                                                                                                                                                                             |

### Mentions in Send Message

When **To** is a space or group chat, a **Mention** field lists its members (not you) and **@all (everyone in this space)**. For each person you pick:

- If the message has `@` followed by their full or first name (any case, whole word), the first one becomes the mention. A first name shared by two picked people isn't used; type the full name.
- Otherwise the mention goes at the start of the message, in the order you picked.
- `@all` and `@everyone` in the text become the everyone mention the same way.

Text in `` `code` `` and ` ``` ` blocks is left alone, and people already mentioned aren't mentioned twice. A **Preview** under the message shows what will be sent. Changing **To** clears the picked mentions. Mentions use Chat's `<users/{id}>` and `<users/all>` syntax; a space's permission settings can limit who may use `@all`. The AI `send-message` tool takes `mentions` as names or emails of the conversation's members (or `all`) and stops with the list of candidates if a name matches nobody or several people.

In message lists you can reply in a thread, add a reaction, copy the text or the message link, and open the message in Google Chat.

### Preferences

- **Google OAuth Client ID** (required): the iOS client from Setup.
- **Open With**: browser or installed Chat web app for every "Open in Google Chat" action. Empty uses your default browser.
- **Unread Lookback (Days)**: only unread messages from this many days are counted (default 14, at most 90).
- **Default View** (My Messages): All or Unread Only, for the first time you open it. After that it remembers your last choice.

### AI

Use `@google-chat` in Raycast AI to list spaces, read recent messages, get unread messages, search messages, find people, send messages and add reactions. Sending and reacting always ask you to confirm first.

## My Messages

A list of your conversations modelled on Google Chat's **Home**, one row per space, group chat or DM:

- **Title**: the space name, or the other person's name for DMs.
- **Subtitle**: the latest message from someone else, as `Sender: text` (mentions as `@Name`). Your own messages are never shown as the preview and never count as unread.
- **Accessories**: the unread count, `@` when a message mentions you, a reply icon ("You replied") when the newest message is yours, a thread icon when the previewed message is a thread reply, and the time of the latest message.

Two sections:

- **Unread**: conversations with unread messages from others, newest first, with counts and mentions. The preview is the newest unread message.
- **Read**: every other conversation, most recently active first, 25 at a time; scroll to load more. For each page the extension lists the newest few messages of each conversation (5 per request, at most 3 requests) until it finds one from someone else.

The **View** dropdown switches between **All** and **Unread Only** (⌘U toggles it); Unread Only shows just the Unread section. The choice is remembered; **Default View** sets the first one.

Actions: View Messages, Open in Google Chat (uses **Open With**), Send Message, Mark as Read and Mark All as Read (on unread rows), Copy Link, Toggle Unread Only (⌘U) and Refresh (⌘R). The command's root search subtitle shows the unread total from its last load, refresh or mark-as-read.

## Unread Chat

A background command that shows your unread total as its root search subtitle, e.g. `12 unread · 4 spaces · 2 mentions` or `No unread messages`.

- **Run it once to start.** Raycast only runs it every 5 minutes after you've run it yourself once (and signed in).
- **Every 5 minutes** it updates the subtitle. If My Messages or the AI checked in the last 2 minutes, it reuses that result instead of asking Google again. If the check fails, the subtitle says `Couldn't check unread`.
- **Running it** checks again, then opens the conversation in Google Chat when exactly one has unread messages (using **Open With**), or else My Messages in Unread Only.

## How unread works

Unread counts come from Google Chat's own unread state, not from guessing. Unread Chat, My Messages and the AI `get-unread` tool share one result: Unread Chat checks every 5 minutes in the background, and opening My Messages always checks again and updates Unread Chat's subtitle. Marking a conversation read in My Messages updates it too. The extension asks Google's message search for `is_unread()` messages from the lookback window (`is_unread() AND create_time >= "…"`), 100 at a time, up to 500. Above that the total shows as `500+`. Your own messages never count.

Google's `is_unread()` also counts every reply you haven't opened in threads you don't follow, which Chat's Home never shows. So a message counts only when it is newer than your read position in that conversation (`spaceReadState`) and is either a new top-level message or a thread reply that @mentions you. That matches the unread conversations on Chat's Home. Like Google's search in general, it leaves out muted spaces and messages from Chat apps. Mark as Read and Mark All as Read move the conversation's read position to now, which clears every message in it.

If Google rejects the search (for example an admin policy or an API error), the extension falls back to each space's read position: messages after your last read time in recently active spaces, including muted ones. Spaces that have no read position are skipped rather than guessed.

## Limits

- **Polling, not push.** Google only delivers real-time Chat events through Pub/Sub, so Unread Chat checks every 5 minutes.
- **Search skips some messages.** Google's message search, which also powers the unread counts, excludes muted spaces, messages from Chat apps, app DMs and blocked users.
- **Threads in DMs.** Google documents replying in a thread for named spaces. In DMs and group chats, Send Message only lists threads that already have replies; if replying isn't possible, the message starts a new thread.
- **No presence or status.** The API only exposes your own availability, not other people's, so there is no "online" indicator.
- **Rate limits.** Google allows 1 message per second per space and 300 searches per minute per project. The extension spaces out sends and retries rate-limited requests up to 3 times.
- **Names.** Chat doesn't always return names for people outside your shared spaces; the extension then looks them up in your directory and caches them.
- **Text only.** Messages are sent as text with Chat formatting (`*bold*`, `_italic_`, `~strike~`, `` `code` ``). Attachments and cards aren't supported.
