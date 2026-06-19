# Craft for Raycast

Search your content, open and add to Daily Notes, and manage Spaces from Raycast.

## Requirements

[Craft](https://www.craft.do/) must be installed (regular or Setapp version).

## Features

### 🔍 Search Blocks

Search Craft's local index from Raycast.

- Search Document titles and Blocks content across enabled Spaces
- Filter by Space or search all
- Open results in Craft
- Create a new Document from the current query
- Optional detail view shows Document previews

![Search Blocks](./metadata/craft-search.png)

### 📅 Daily Notes

Open Daily Notes in the selected Space.

- Shortcuts for `today`, `yesterday`, and `tomorrow`
- Parse exact dates and natural-language queries like `last Monday`
- Remembers the last selected Space

![Daily Notes](./metadata/craft-daily-notes.png)

### ✍️ Add to Daily Note

Add content to today's Daily Note without leaving Raycast.

- Targets any enabled Space; defaults to primary
- Optional timestamp with custom format
- Configurable prefix, suffix, and append position
- Always copies content to clipboard for safety
- Appends directly if today's note exists; otherwise opens Craft with content ready to paste

![Add to Daily Note](./metadata/craft-append.png)

### 🏷️ Manage Spaces

Manage which Craft Spaces appear in the extension.

- Rename Spaces and copy their IDs
- Enable or disable non-primary Spaces
- Access the tutorial to identify your Spaces by ID

![Manage Spaces](./metadata/craft-manage-spaces.png)

#### How to determine your Spaces

You only need this once per Space.

1. Open Craft and switch to the Space you want to name
2. Open any Document in that Space
3. Right-click on any Block
4. Choose **Copy As** → **Deeplink**

The copied deeplink will look like this:

```text
craftdocs://open?blockId=ABC123&spaceId=1ab23c45-67de-89f0-1g23-hijk456789l0
```

The **Space ID** is the value after `spaceId=`.

Back in Raycast, return to **Manage Spaces**, find the matching ID, and rename it. You can also use the built-in **Copy Space ID** action to confirm which entry matches the current Craft Space.

![Find Space ID](./media/craft-find-spaceid.png)

Once you know which ID corresponds to which Space, you can rename them for better organization.

## Commands

| Command               | Description                                       |
| --------------------- | ------------------------------------------------- |
| **Search Blocks**     | Search indexed Craft content and create Documents |
| **Daily Notes**       | Open Daily Notes in a selected Space              |
| **Add to Daily Note** | Copy, append, or open today's Daily Note          |
| **Manage Spaces**     | Rename Spaces and control their visibility        |

## Configuration

### Application Selection

If you have multiple versions of Craft installed, choose the app in extension preferences. Supported bundle IDs are the regular Craft app and Craft via Setapp. If left empty, the extension auto-selects the first supported installed app.

### Search Preferences

- **Detailed View**: Switch the view from Block rows to Document rows with a detail pane content preview

### Add to Daily Note Preferences

- **Position**: Append content at the beginning or end
- **Timestamp**: Automatically include current time with each entry
- **Time Format**: Use patterns like `HH:mm` (14:30), `h:mm A` (2:30 PM) or `HH:mm:ss` (14:30:45)
- **Prefix / Suffix**: Wrap content with custom text

### Space Management

- **Custom Names**: Give your Spaces names instead of using Space IDs
- **Enable / Disable**: Hide unused Spaces from all commands
- **Persistent Settings**: Names, enabled state, and filter selections are shared across all commands

## How It Works

The extension reads Craft's local container data to discover Spaces and uses Craft's local SQLite search index for `Search Blocks` and Daily Note lookup. Search is offline and limited to Spaces that are both synced locally in Craft and enabled in the extension.

Currently the extension uses [Craft's URL Scheme](https://support.craft.do/hc/en-us/articles/360020168838-Using-URL-Scheme) for Document creation, note opening, and note appending. Migration to their new API is planned but not implemented yet.

## Troubleshooting

### Search Results Not Appearing

Open the selected Craft app once so it can create its local data directory, then let it finish syncing. Search Blocks only works when Craft's local search index exists. Disabled Spaces are intentionally hidden from results.

### Add to Daily Note Opens Craft Instead of Appending

This is expected when today's Daily Note cannot be found in the local Craft search database. The command still copies the formatted content, then opens today's Daily Note so you can paste it manually.

### Multiple Craft Versions

If you have both regular and Setapp versions installed, specify your preferred version in the extension preferences under "Application to search in", or leave the preference empty to let the extension auto-detect a supported install.

### Performance Issues

The extension performs best when Craft has finished syncing. Large Document collections may take a moment to index initially.

### Space Management Issues

If no Spaces appear, open Craft first and wait for sync. If names or enabled state look wrong after upgrading, the extension will try to migrate legacy Space settings from Craft's container into Raycast support storage automatically.

## Previous Developer / Maintainer

This extension was originally developed by [Vitaliy Kudryk](https://github.com/kudrykv) and is currently maintained by [Samuel François](https://github.com/sfkmk).

## Disclaimer

This project is not affiliated, associated, authorized or in any way officially connected with Craft Docs. The official website can be found at [https://www.craft.do](https://www.craft.do). "Craft Docs" as well as related names, marks, emblems and images are registered trademarks of their respective owners.
