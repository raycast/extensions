<p align="center">
  <img width="100" src="assets/extension-icon.png" alt="Are.na logo" />
</p>

# Are.na for Raycast

Search your collections, save references, and connect ideas on Are.na without leaving Raycast. Browse channels and blocks, preview text and images, or use Raycast AI to organize your research.

## Getting started

1. Open any Are.na command in Raycast.
2. Sign in to your Are.na account when prompted.
3. Start with **My Channels** to browse your collections or **Search Everything** to discover content.

Prefer a personal access token? Create one in [Are.na’s token settings](https://www.are.na/settings/personal-access-tokens) and enter it in the extension’s **Personal Access Token** preference. Leave that preference blank to use browser sign-in. Your token needs write access to create, edit, or remove content.

The extension supports macOS. Available content and editing actions depend on your Are.na account’s permissions.

## Commands

| Command               | What you can do                                                                        |
| --------------------- | -------------------------------------------------------------------------------------- |
| **Search Everything** | Search channels, blocks, and users together. Save queries and revisit recent searches. |
| **Find Channels**     | Discover channels, sort results, and browse their contents.                            |
| **Find Blocks**       | Search text, images, links, attachments, and embeds with type filters and sorting.     |
| **Find Users**        | Find people on Are.na and browse search results.                                       |
| **My Channels**       | Browse channels you created, with more results loaded as you scroll.                   |
| **My Profile**        | View your profile and account counts.                                                  |
| **Create Channel**    | Create a public, closed, or private channel with an optional Markdown description.     |
| **Create Block**      | Save a URL or Markdown text to one or more channels.                                   |
| **Open Are.na Link**  | Open a channel or block directly in Raycast using its URL or ID, or a channel slug.    |

## Save and organize

### Save a reference

Open **Create Block**, paste a URL or write text in Markdown, and choose the destination channels. You can add an optional title and description.

The **Channels** field accepts up to 20 channel URLs, slugs, or IDs, separated by commas. For example: `design-notes, reading-list`. Use your own channel identifiers. Are.na processes URLs into the appropriate block type.

To add an existing block to another channel, use **Connect Block to Channels** from the block’s actions.

### Work with your collections

From search results and channel views, you can:

- Preview text and images, open source links, and download images or attachments.
- Create blocks in a channel or edit a block’s title, text content, and description.
- Connect blocks to other channels or remove them from the current channel.
- Edit a channel’s title, description, and visibility, manage collaborators, or delete a channel.

**Remove from This Channel** removes only that connection. **Delete Block** deletes the block itself. Removal and deletion actions ask for confirmation.

### Choose channel visibility

| Visibility  | Meaning                                             |
| ----------- | --------------------------------------------------- |
| **Public**  | Visible to everyone and open to contributions.      |
| **Closed**  | Visible to everyone, with contributions restricted. |
| **Private** | Access is restricted.                               |

## Use with Raycast AI

Mention the Are.na extension in Raycast AI to search, read, create, and organize content through your connected account.

Try these prompts, replacing example channel names and block IDs with your own:

- “Find image blocks about typography in my Are.na content.”
- “Save the text ‘A note about typography’ to my design-notes channel.”
- “Connect existing block 123 to my references channel.”
- “Change the description of design-notes to ‘Typography research’.”
- “Give me a sampled overview of my design-notes channel.”
- “Which channels contain block 123?”
- “Remove block 123 from design-notes, but keep the block itself.”

### Available AI tools

| Workflow       | Tools                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Discover       | Search Are.na, with content type filters and scopes for all content, your content, or accounts you follow |
| Your account   | Get My Are.na Profile, List My Channels                                                                   |
| Explore people | Get User, Get User Contents                                                                               |
| Read channels  | Get Channel Details, Get Channel Contents, Get Channel Digest                                             |
| Read blocks    | Get Block Details, Get Block Connections                                                                  |
| Create         | Create Channel, Create Block                                                                              |
| Organize       | Update Channel, Update Block, Connect Content to Channels, Remove Connection                              |

AI actions that change content ask for confirmation in Raycast. Creating a block saves new content; connecting content adds an existing block or channel to another collection.

Results load in pages. Channel digests summarize a sample of up to 100 items and identify partial coverage. Long block text may be shortened, with truncation indicated in the tool result.

## Preferences

| Preference                | Default    | Purpose                                                                 |
| ------------------------- | ---------- | ----------------------------------------------------------------------- |
| **Personal Access Token** | Empty      | Use a token instead of browser sign-in.                                 |
| **Default Page Size**     | 24         | Number of search results fetched per page.                              |
| **Default Search Sort**   | Best Match | Choose Best Match, Recently Updated, or Recently Created for discovery. |

## Development

```sh
npm ci
npm run dev
```

Validate changes with:

```sh
npm test
npm run build
npm run lint
npx ray evals
```

API regression tests use mocked HTTP responses and do not modify an Are.na account. AI evaluations use the scenarios in `ai.json` and require Raycast’s AI evaluation service.

The extension uses the Are.na v3 API. Its AI capabilities draw on the [official MCP tools](https://github.com/aredotna/mcp) and [SDK reference](https://www.are.na/developers/resources/sdk); no separate MCP server setup is required.

## Credits

Developed by [Alvin Ashiatey](https://www.are.na/alvin-ashiatey/index) with contributions from the Raycast community. For feedback, [contact Alvin](mailto:mail@alvinashiatey.com?subject=Raycast%20Extension).
