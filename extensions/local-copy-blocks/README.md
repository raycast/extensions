# Local Copy Blocks

`Local Copy Blocks` is a Raycast extension for copying reusable text blocks from local Markdown files, either as-is or with supported Dynamic Placeholders expanded at copy time.

Your folders and Markdown files remain the source of truth. The extension adds a fast Raycast copy workflow on top of those files, so you can keep editing, versioning, and organizing them with the tools you already use.

The main strength is the combination of local files, quick access, and copy-time expansion. You can keep simple Markdown files as reusable blocks, find them from Raycast, and choose between copying the original text or copying a version where supported Dynamic Placeholders such as the current date, time zone, UUID, and clipboard text are expanded for the moment you copy.

## What This Extension Solves

If you keep reusable text blocks in Markdown files, editing and version history can stay in your usual editor and Git workflow. The missing part is quickly finding the right file and copying its content when you need to reuse it.

`Local Copy Blocks` focuses on that launch and copy workflow.

- You manage one reusable copy block per Markdown file
- You edit those Markdown files in your usual editor, such as Visual Studio Code
- You keep content history in Git or another file-based workflow
- You want Raycast to quickly search, preview, and copy existing Markdown-backed text blocks
- You want reusable blocks that can include copy-time values such as the current date, time zone, UUID, or clipboard text

## Features

- Recursively lists Markdown files under enabled and configured folders. The `.md` extension is matched case-insensitively
- Provides three Block Set commands for frequently used folders
- Searches across all enabled and configured Block Sets
- Copies the full content of the selected Markdown file
- Expands supported Dynamic Placeholders such as `{date}`, `{datetime}`, `{timezone}`, `{now}`, `{uuid}`, and `{clipboard}` when copying
- Shows an optional preview of the beginning of the selected file
- Opens the selected file in a configured editor, the default app, another compatible app, or Finder
- Sorts the list by updated time, file name, or relative path

![Local Copy Blocks showing a Block Set with Markdown preview and copy action](media/local-copy-blocks-1.png)

## Requirements

Prepare at least one folder that contains Markdown files you want to reuse as copy blocks.

Each Markdown file is treated as one reusable copy block. Frontmatter, special code blocks, or custom separators are not required.

Example:

```text
copy-blocks/
├── review.md
├── refactor.md
└── writing/
    └── blog-outline.md
```

`Copy Raw Content` copies the full content of the selected Markdown file.

## Setup

After installing the extension, open `Local Copy Blocks` from Raycast Preferences > Extensions and set at least one of `Block Set 1 Folder`, `Block Set 2 Folder`, or `Block Set 3 Folder`.

You can also open the same preferences screen from `Open Extension Preferences` when a disabled or unconfigured Block Set is opened.

You do not need to configure all three Block Set Folders. At least one enabled Block Set with a configured Block Set Folder is required to show Markdown files.

Each Block Set appears as its own section in Raycast Preferences. The `Enable Block Set N` checkbox controls whether that Block Set is included in its command and in `All Block Sets`.

```text
Local Copy Blocks Preferences
├── Block Set 1
│   ├── Enable Block Set 1
│   ├── Block Set 1 Folder
│   └── Block Set 1 Name
├── Block Set 2
│   ├── Enable Block Set 2
│   ├── Block Set 2 Folder
│   └── Block Set 2 Name
├── Block Set 3
│   ├── Enable Block Set 3
│   ├── Block Set 3 Folder
│   └── Block Set 3 Name
└── Shared Preferences
    ├── Editor
    ├── Preview Line Count
    └── Preview Max Characters
```

| Block Set Section | Preference         | Requirement                   | Description                                                |
| ----------------- | ------------------ | ----------------------------- | ---------------------------------------------------------- |
| Block Set 1       | Enable Block Set 1 | Optional, on by default       | Includes `Block Set 1` in its command and `All Block Sets` |
| Block Set 1       | Block Set 1 Folder | Required to use `Block Set 1` | Markdown folder used by `Block Set 1`                      |
| Block Set 1       | Block Set 1 Name   | Optional                      | Display name shown in Raycast                              |
| Block Set 2       | Enable Block Set 2 | Optional, on by default       | Includes `Block Set 2` in its command and `All Block Sets` |
| Block Set 2       | Block Set 2 Folder | Required to use `Block Set 2` | Markdown folder used by `Block Set 2`                      |
| Block Set 2       | Block Set 2 Name   | Optional                      | Display name shown in Raycast                              |
| Block Set 3       | Enable Block Set 3 | Optional, on by default       | Includes `Block Set 3` in its command and `All Block Sets` |
| Block Set 3       | Block Set 3 Folder | Required to use `Block Set 3` | Markdown folder used by `Block Set 3`                      |
| Block Set 3       | Block Set 3 Name   | Optional                      | Display name shown in Raycast                              |

Other preferences apply to all Block Sets.

| Preference             | Requirement | Description                                                           |
| ---------------------- | ----------- | --------------------------------------------------------------------- |
| Editor                 | Optional    | App used by `Open in Editor`. When unset, `Open` uses the default app |
| Preview Line Count     | Optional    | Number of leading lines shown in the preview. Default is `10`         |
| Preview Max Characters | Optional    | Maximum number of characters shown in the preview. Default is `4000`  |

If you turn off `Enable Block Set N`, that Block Set is excluded from its command and from `All Block Sets` until you turn it on again.

If you open an enabled Block Set command without setting its folder, the extension shows a configuration screen.

If a Block Set Name is empty, the configured folder name is used as the display name.

## First Use

1. Open `Local Copy Blocks` from Raycast Preferences > Extensions
2. Set `Block Set 1 Folder` to a folder that contains Markdown-backed text block files
3. Keep `Enable Block Set 1` turned on
4. Optionally set `Block Set 1 Name`
5. Open `Block Set 1` in Raycast
6. Select a Markdown file from the list
7. Press Enter to run `Copy Raw Content`

Open `All Block Sets` when you want to search across multiple enabled folders.

## Commands

| Command        | Description                                                                       |
| -------------- | --------------------------------------------------------------------------------- |
| Block Set 1    | Shows Markdown-backed text blocks from `Block Set 1 Folder`                       |
| Block Set 2    | Shows Markdown-backed text blocks from `Block Set 2 Folder`                       |
| Block Set 3    | Shows Markdown-backed text blocks from `Block Set 3 Folder`                       |
| All Block Sets | Searches Markdown-backed text blocks across all enabled and configured Block Sets |

Raycast hotkeys can be assigned per command. Assign hotkeys to the Block Sets you use most often, and use `All Block Sets` when you want to search across enabled folders.

## Actions

The following actions are available when a Markdown file is selected.

| Action                      | Description                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| Copy Raw Content            | Copies the full Markdown file content to the clipboard without changes                            |
| Copy Expanded Content       | Replaces supported Dynamic Placeholders in the full Markdown file content, then copies the result |
| Show Preview / Hide Preview | Toggles the preview pane                                                                          |
| Open in Editor              | Shown when `Editor` is configured. Opens the Markdown file in the configured editor               |
| Open                        | Shown when `Editor` is not configured. Opens the Markdown file in the default app                 |
| Open with…                  | Opens the Markdown file with another compatible app                                               |
| Show in Finder              | Shows the Markdown file in Finder                                                                 |

`Copy Raw Content` is the default action. Pressing Enter copies the full content of the selected Markdown file.

`Open in Editor` and `Open` are not shown at the same time. When `Editor` is configured, the extension shows `Open in Editor`. When `Editor` is not configured, it shows `Open`.

## Copy Raw Content and Copy Expanded Content

`Copy Raw Content` copies the Markdown file content without changing it.

`Copy Expanded Content` replaces supported Dynamic Placeholders in the Markdown file content before copying. It does not modify the original Markdown file.

Local Copy Blocks supports a subset of placeholder names used by Raycast Dynamic Placeholders, plus its own `{timezone}` and `{now}` placeholders. It is not fully compatible with Raycast Dynamic Placeholders, and the replacement values are generated by Local Copy Blocks.

Reference: [Raycast Dynamic Placeholders](https://manual.raycast.com/dynamic-placeholders)

Example:

```markdown
Date and time: {datetime}
Time zone: {timezone}
Now: {now}

Clipboard:
{clipboard}
```

When you run `Copy Expanded Content`, `{datetime}` is replaced with the current date and time from your environment, `{timezone}` with the current time zone, `{now}` with the current date and time plus time zone, and `{clipboard}` with the current clipboard text.

If a Markdown file does not use Dynamic Placeholders, `Copy Raw Content` and `Copy Expanded Content` produce effectively the same copied text.

## Dynamic Placeholders

`Copy Expanded Content` replaces only the Dynamic Placeholders listed below.

| Placeholder   | Replacement                                                                      |
| ------------- | -------------------------------------------------------------------------------- |
| `{date}`      | Current date based on your environment locale                                    |
| `{time}`      | Current time based on your environment locale                                    |
| `{datetime}`  | Current date and time based on your environment locale                           |
| `{day}`       | Day of the week based on your environment locale                                 |
| `{timezone}`  | Local Copy Blocks placeholder for the time zone in `Asia/Tokyo UTC+09:00` format |
| `{now}`       | Current date and time from `{datetime}` plus `{timezone}`, separated by a space  |
| `{uuid}`      | Random UUID generated separately for each `{uuid}` occurrence                    |
| `{clipboard}` | Current clipboard text                                                           |

Placeholders that are not listed here are not replaced and remain unchanged in the copied text.

## Preview

Preview is enabled by default on first launch.

When preview is shown, the extension displays the beginning of the selected file in Raycast's detail pane. Preview content is not loaded while building the list. It is loaded only for the selected file when needed.

Use `Show Preview` / `Hide Preview` to toggle the preview pane. The selected state is stored locally by Raycast and restored the next time you use the extension.

## Sort

Use the `Sort` dropdown on the right side of the search bar to change the list order.

Name and path sorting use the runtime default locale.

| Sort                   | Description                                       |
| ---------------------- | ------------------------------------------------- |
| Updated (Newest First) | Newest updated files first. This is the default   |
| Updated (Oldest First) | Oldest updated files first                        |
| Name (A-Z)             | File name ascending                               |
| Path (A-Z)             | Relative path from the Block Set Folder ascending |

## Markdown File Handling

The extension recursively reads Markdown files under enabled and configured folders. Files are included when their extension is `.md`, matched case-insensitively. Examples include `.md`, `.MD`, `.Md`, and `.mD`.

The following files and folders are excluded from the list.

- Files under `.git`
- Files under `node_modules`
- Files under hidden directories
- Files whose extension is not `.md`, matched case-insensitively

Symbolic links are not followed.

## Troubleshooting

### A Block Set asks me to configure preferences

The Block Set is disabled or its folder is not configured. Open Raycast Extension Preferences, turn on the Block Set if needed, and set the Block Set Folder.

### Markdown files are not shown

Check the following.

- The Block Set Folder points to the correct folder
- The file extension is `.md`, matched case-insensitively
- The file is not under `.git`, `node_modules`, or a hidden directory
- The folder exists and can be read by Raycast

### A configured folder fails to load

The configured path may not be a folder, the folder may have been deleted or moved, or Raycast may not be able to read it. Open Extension Preferences and set the Block Set Folder again.

In `All Block Sets`, folders that can be read still show their Markdown files. Folders that cannot be read appear in a `Could Not Load` section.

### `Open in Editor` does not open the expected app

Check the `Editor` preference. When `Editor` is not configured, the action is shown as `Open` and the Markdown file opens in the default app.

### `Copy Expanded Content` gives an unexpected result

Only the placeholders listed in the Dynamic Placeholders table are replaced. Placeholders that are not listed remain unchanged in the copied text.

When `{clipboard}` is used, the clipboard text at the time of copying is inserted into the copied result.

## Privacy and Data Handling

`Local Copy Blocks` reads Markdown files under the enabled Block Set Folders that you configure.

Markdown file content is sent to the clipboard only when you run a copy action.

When you use `Copy Expanded Content`, the current clipboard text is read only if the Markdown file content contains `{clipboard}`.

The preview visibility state is stored locally by Raycast.

This extension does not make network requests.

## File Safety

`Local Copy Blocks` does not create, edit, rename, move, or delete Markdown files. It does not perform Git operations or sync files to a cloud service.
