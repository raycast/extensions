# Cereal Eyes for Raycast

Save, browse, and share your [Cereal Eyes](https://cereal.email) snippets without leaving your keyboard. Create new snippets, manage visibility, generate share links, send burner links, and manage short URLs — all from Raycast.

---

## Requirements

Before you can use this extension, you'll need:

- **[Raycast](https://raycast.com)** installed on your Mac
- A **Cereal Eyes account** on the **Pro plan** — API access is a Pro feature
- A **Cereal Eyes API token** — generate one in your account under **Settings → API Tokens**

When creating your API token, make sure to enable the following scopes:

| Scope               | What it unlocks                 |
| ------------------- | ------------------------------- |
| Read snippets       | Browse and search your snippets |
| Create snippets     | Save new snippets               |
| Update snippets     | Edit existing snippets          |
| Delete snippets     | Remove snippets                 |
| Share snippets      | Create and manage share links   |
| Burner links        | Create self-destructing links   |
| Read contacts       | Suggest recipients when sharing |
| Read short URLs     | List your short links           |
| Create short URLs   | Create new short links          |
| Update short URLs   | Rename links or pause them      |
| Delete short URLs   | Remove short links              |
| Short URL analytics | View click analytics            |

---

## Setup

1. Open Raycast and search for **"Create Snippet"**, **"My Snippets"**, or **"URL Shortener"**
2. The first time you open a command, Raycast will prompt you to configure the extension
3. Paste your API token into the **API Token** field
4. Press **Save** — you're ready to go

---

## Commands

### Create Snippet

Quickly save a new snippet from anywhere on your Mac.

**Fields:**

- **Title** — A short name for your snippet. Optional, but makes it easier to find later.
- **Content** — The body of your snippet. This is the only required field.
- **Language** — The programming language or format. Used for syntax highlighting when you view the snippet on Cereal Eyes. Choose from a full list including popular languages like TypeScript, Python, SQL, and more.
- **Visibility** — Toggle whether the snippet is **Public** (visible to anyone with the link) or **Private** (only visible to you). Defaults to public.
- **Expires At** — Set a date and time for the snippet to expire. Leave empty if you want it to stick around indefinitely.

Press **⌘ ↵** to save. On success, you'll be taken back to Raycast root. The toast notification gives you a **"Create Another"** option if you're on a roll.

---

### My Snippets

Browse and manage all of your snippets in one place.

**Filtering:**
Use the dropdown in the top-right corner to filter by **All**, **Public**, or **Private** snippets.

**Searching:**
Type in the search bar to filter snippets by title or content preview.

**Each snippet shows:**

- A content preview in the subtitle
- A language tag (if set)
- A lock icon if the snippet is private
- A clock icon if the snippet is expiring soon or has already expired
- A bolt icon if there's an active burner link

**Actions available from the list** (press **⌘ K** to open the action panel):

| Action                     | Shortcut | What it does                                               |
| -------------------------- | -------- | ---------------------------------------------------------- |
| View Detail                | ↵        | Opens the full snippet with metadata sidebar               |
| Edit Snippet               | ⌘ E      | Opens an edit form pre-filled with current values          |
| Copy Content               | ⌘ C      | Copies the snippet content to your clipboard               |
| Make Public / Make Private | ⌘ ⇧ V    | Toggles visibility without opening a form                  |
| Copy Link Share            | ⌘ S      | Creates a public share link and copies it instantly        |
| Copy Burner Link (1 View)  | ⌘ ⌥ S    | Creates a one-time link that self-destructs after one view |
| Share with Contacts…       | ⌘ ⇧ S    | Opens a form to send a restricted share to specific people |
| Custom Share…              | —        | Opens the full share form for more control                 |
| Manage Shares              | ⌘ M      | Opens a list of all shares for this snippet                |
| Refresh                    | ⌘ R      | Reloads the snippet list                                   |
| Delete Snippet             | ⌃ X      | Deletes the snippet (asks for confirmation first)          |

---

### URL Shortener

Browse and manage your Cereal Eyes short links in Raycast.

**What you can do:**

- Create a new short link and copy it immediately
- Search links by short URL, destination URL, title, or code
- Rename links and toggle them active/inactive
- Copy the short URL or destination URL
- Open the short link or destination in your browser
- View click analytics, including countries, devices, and referrers
- Delete links you no longer need

**Notes:**

- Custom codes and expirations are available from the creation form, but they still depend on your Cereal Eyes plan
- Analytics visibility depends on both your plan and the token scopes you enabled

---

### Snippet Detail

The detail view shows the full content of your snippet alongside a metadata sidebar.

**Sidebar shows:**

- Snippet ID
- Language
- Visibility (Public or Private)
- Whether a burner link is currently active
- Expiry date (if set)
- Created and last updated timestamps

**Actions available from the detail view:**

| Action                     | Shortcut | What it does                              |
| -------------------------- | -------- | ----------------------------------------- |
| Copy Content               | ⌘ C      | Copies the snippet body to your clipboard |
| Edit Snippet               | ⌘ E      | Opens the edit form                       |
| Make Public / Make Private | ⌘ ⇧ V    | Toggles visibility                        |
| Create Link Share          | ⌘ S      | Creates a public share link               |
| Share with Contacts        | ⌘ ⇧ S    | Restricted share with specific recipients |
| Create Burner Link         | ⌘ ⌥ S    | One-time self-destructing link            |
| Manage Shares              | ⌘ M      | View and revoke all active shares         |
| Copy ID                    | —        | Copies the snippet's UUID                 |

---

## Sharing

Cereal Eyes supports three types of share links, each with a different use case.

### Link Share

A standard shareable URL. Anyone with the link can view the snippet. You can optionally require a Cereal Eyes account to access it.

### Burner Link

A link that self-destructs after a set number of views (defaults to 1). Great for sending something once and knowing it won't be passed around. Once it burns out, the link stops working.

### Restricted Share

An invite-only link sent to specific email addresses. When you open **"Share with Contacts"**, the extension loads your saved Cereal Eyes contacts and recent recipients — select from the list or type any email address. You can optionally require a Cereal Eyes account for access.

**All share types support:**

- An optional expiry date
- Viewing in **Manage Shares**, where you can copy the URL or revoke it at any time

---

### Manage Shares

Opens a list of every share for a given snippet, split into **Active** and **Inactive** sections.

**Each share shows:**

- The share type (Public Link, Restricted, or Burner)
- The share URL (for link and burner types)
- View count and — for burner links — views remaining
- Expiry date if one was set
- Whether it was revoked or burned out

**Actions:**

- **Copy Share URL** — copies the link to your clipboard
- **Revoke Share** — immediately deactivates the link (asks for confirmation, cannot be undone)

---

## Privacy & Security

- Your API token is stored in Raycast's secure preferences — it is never logged or sent anywhere other than the Cereal Eyes API
- Snippet content is encrypted at rest on Cereal Eyes servers
- Burner links are stored as hashed tokens — neither Raycast nor the extension stores the plain share URL after it is copied to your clipboard
- Revoking a share immediately invalidates the link — no grace period

---

## Troubleshooting

**"API Token required" message on first open**
You haven't entered your API token yet. Press **Open Preferences** in the empty state, or go to Raycast **Settings → Extensions → Cereal Eyes** and paste your token into the **API Token** field.

**403 error / "API access is available on Pro"**
Your Cereal Eyes account is not on the Pro plan, or the token was created before your plan was upgraded. Upgrade your plan, then generate a new token.

**Snippets not loading / network errors**
Check your internet connection. If you recently rotated your API token, update it in Raycast's extension preferences.

**Share links not working**
The share may have been revoked, expired, or — for burner links — already viewed. Open **Manage Shares** from the snippet to see the current status.

**Icon not showing in Raycast**
Stop the dev server (`Ctrl C`), run `npm run dev` again, and Raycast will pick it up. See the development section below if you're running the extension locally.

---

## Development

If you'd like to run the extension locally against your own Cereal Eyes instance, you'll need:

- [Node.js](https://nodejs.org) (v18 or later)
- A local Cereal Eyes instance running (the backend project)
- A local API token from that instance with the required scopes

**Getting started:**

```bash
git clone https://github.com/jermashley/cereal-eyes-raycast
cd cereal-eyes-raycast
npm install
npm run dev
```

Raycast will open with the extension loaded in development mode. You'll see a yellow **DEV** badge next to it.

**Configure your local credentials:**

Go to **Raycast Settings → Extensions → Cereal Eyes** and fill in:

- **Dev API Token** — a token from your local Cereal Eyes instance
- **Dev API Base URL** — your local instance URL (defaults to `https://cereal-eyes-bravo.test/api/v1`)

Leave **API Token** empty while developing locally — the extension will automatically use the dev credentials when running in dev mode.

> **Note:** SSL certificates for `.test` domains (issued by Herd or Valet) are not trusted by Node.js out of the box. The extension automatically disables TLS verification in dev mode to handle this. This only affects local development — production traffic is always fully verified.

**Stopping the dev server:**

Press `Ctrl C` in the terminal. The extension will disappear from Raycast until you run `npm run dev` again.
