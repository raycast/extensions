# Substack

Search [Substack](https://substack.com/) posts and profiles, manage connections, and create unpublished newsletter drafts.
Public search works without account setup.

## Set up accounts

Open **Manage Accounts** and choose **Add Account**. Enter your publication's Substack name or address, such as `yourname.substack.com`.
Use the Substack address even if your publication has a custom domain. The optional account label defaults to the publication name.

Sign in to that publication in your browser. In the browser developer tools, find Cookies under Application or Storage.
Copy the value of `substack.sid` into **Substack Session Cookie**.
If your account requires `connect.sid`, copy its value into **Connect Session Cookie**.
Paste cookie values only, without names or a full Cookie header.

Connections and recovery links use Raycast's encrypted local storage.
You can add separate connections for different logins to the same publication.
Choose **Set as Default** to use one connection when no account is specified.
Removing a connection removes its local recovery links. Remote drafts stay in Substack.

If Substack denies access, sign in again and replace the cookie values through **Edit Account**.
Never paste cookies into an AI conversation.

For an existing installation, open **Create Draft** once to import valid legacy preferences and saved draft links.
The import runs once. Removing an imported connection does not recreate it.
Links for other publications are retained without assigning them to an account.
List My Drafts and AI tools use the saved connections after this import or manual setup.

## Create and list drafts

**Create Draft** opens the form directly. Choose an account, enter a title and optional subtitle, and provide Markdown text or a Markdown file.
The command creates an unpublished newsletter draft and opens the Substack editor for review.
Choose the audience and email delivery in Substack when you publish.

**List My Drafts** fetches unpublished newsletter drafts from Substack, including drafts created outside this extension.
Choose an account from the dropdown. Open a draft with Enter, refresh the list, or load another page when available.
Press **⌘N** on macOS or **Ctrl+N** on Windows to create a draft from the list, including when a search has no results.
Local recovery links appear separately when the remote page does not contain them.
**Needs Review** means the extension could not verify the saved body.

Choose **Open Draft in Substack** or press **⌘O** on macOS or **Ctrl+O** on Windows to open the website editor.
Choose **Edit Draft** or press **⌘E** on macOS or **Ctrl+E** on Windows to edit the draft in Raycast.
The native form edits titles, subtitles, and bodies that can be converted to Markdown without losing content or formatting.
For other rich content, the form preserves the body and lets you edit the title and subtitle. Use the website editor for the full body.
If the draft changes in Substack while the form is open, reload it before saving.

If a request fails after draft creation, use the recovery URL to inspect and complete the existing draft.
If a creation request times out, inspect your Substack drafts before trying again.
The extension does not retry uncertain writes. Its private Substack endpoints can change without notice.

## Ask Substack

Raycast's native **Ask Substack** command uses the configured connections and these tools: List Accounts, List My Drafts, and Create Draft.
Try “Show my drafts for Weekly” or “Create a draft for Weekly titled Update with Markdown body Hello readers.”
The AI asks you to choose when multiple connections exist without a default.
An unknown account name does not fall back to another connection.

AI creation returns an editor link without opening the browser.
Publishing, scheduling, and sending email take place in the Substack editor.
If a save fails after creation, inspect the recovery link before making another creation request.

## Supported Markdown

The draft forms and AI tools support headings, bold, italic, links, lists, quotes, horizontal rules, inline code, and remote images.
Put each image in its own paragraph and use a public HTTPS URL.
Code blocks, tables, HTML, strikethrough, task lists, and local image uploads are not supported.
These formats are rejected before draft creation.

## Development

Use Node.js 24.x for development.
Install dependencies with `npm install` and run the extension with `npm run dev`.

Run `npm run fix-lint` and `npm run build` before submitting changes.

Actions use Raycast's common shortcuts for New, Edit, Open, Refresh, Copy, and Remove. Open the action panel to see the shortcuts for your platform. Forms keep Raycast's default submit shortcut, **⌘Enter** on macOS or **Ctrl+Enter** on Windows.
