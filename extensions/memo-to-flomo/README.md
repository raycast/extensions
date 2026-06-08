# MEMO to flomo

MEMO to flomo is a Raycast extension for sending quick Markdown memos to flomo through the incoming webhook API.

## Setup

1. Get your MEMO API URL from flomo settings.
2. Open the extension preferences in Raycast.
3. Paste the URL into `MEMO API URL`.

The API URL is required and stored in Raycast extension preferences. Saving the URL does not send a test memo.

## Usage

1. Open `Send Memo to flomo` in Raycast.
2. Write a memo in the `MEMO` field.
3. Add one or more tags in `Tag`, separated by spaces.
4. Submit the form with Raycast's default submit shortcut, `Command + Enter`.

The memo is sent as Markdown with `content_type: "markdown"`. The editor supports Markdown highlighting and shortcuts for bold text, unordered lists, and ordered lists.

## Tags

Tags are separated by whitespace. These inputs are equivalent:

```text
raycast flomo
#raycast #flomo
raycast #flomo
```

They are sent to flomo as:

```text
#raycast #flomo
```

Duplicate tags are removed while preserving the first occurrence. Comma-separated tags and tags containing spaces are not supported.

## Tag History

After a memo is sent successfully, its tags are saved to local tag history without a storage limit. Recently used tags are shown first, and the command displays all saved tags in `Quick Tags`.

Selecting tags from history updates the `Tag` field without removing manually typed tags that are not part of the visible history.

Use `Clear Tag History` from the action panel to remove saved tags.

Use `Open Extension Preferences` from the action panel to edit the saved API URL.

## List Continuation

When typing at the end of the memo field:

- `- item`, `* item`, and `+ item` continue as `- `.
- `1. item` continues as `2. `.
- Indentation is preserved.
- Pressing return on an empty list item exits the list.

## Scope

This extension is intentionally focused on quick memo entry. It does not clip webpages, attach files, sync remote tags, or persist memo drafts.
