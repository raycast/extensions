# Anycap

Save links and notes to [Anycap](https://anycap.co) from Raycast, and find them again.

Anycap keeps your links, notes, pictures and files on your Mac. This extension talks to the
`anycap-mcp` helper inside Anycap.app, so it reads and writes the same library as the app:
no account, no server, and Anycap does not need to be open.

## Setup

Install [Anycap for Mac](https://anycap.co/download), which requires macOS 26 or later.
If it is not in `/Applications`, set its path in the extension's preferences. The MCP
helper ships inside Anycap.app; there is no separate CLI download or API key to set up.

Save Current Tab asks the browser in front for its page through AppleScript. The first time,
macOS asks you to let Raycast control that browser. Browsers AppleScript cannot reach fall back
to the Raycast browser extension.

## Commands

| Command | What it does |
| --- | --- |
| Capture | A form for a link or note with a title, folder and tags |
| Save Current Tab | Saves the page in front of your browser |
| Search Anycap | Searches every capture; empty, it lists the newest |
| Quick Capture | Saves the link or note you type |
| Save Clipboard | Saves the link or text on the clipboard |
| Browse Folders | Your folders, and the captures in each |
| Browse Collections | Your collections; Copy Brief puts one on the clipboard as Markdown. Requires Anycap Pro |
| Open Latest Capture | Opens what you saved last |

In any list: open a capture in the browser or in Anycap, see its details, copy its URL, a
Markdown link or its Anycap link, move it to another folder, or archive it (with Undo).
Details show saved image previews, dates, folder, tags, author and image dimensions when
available. Previews need Anycap 1.2 or later and come from the local library. Original
attachments stay unchanged. Older app versions still provide text details.

## Raycast AI

In Raycast AI Chat, mention `@Anycap` to save a link or note. Save Capture asks for
confirmation and supports a title, existing folder and tags. List Folders helps the
agent choose a folder. These tools require access to Raycast AI. A save appears in
Anycap's activity trail as Raycast AI.

## Free and Pro

Saving, full-text search, folders, basic capture details, moving and archiving work with
Anycap Free. Browse Collections, Copy Brief, search by meaning and the additional text
and summaries in capture details require Anycap Pro. The regular commands do not
require a Raycast Pro subscription.

## Privacy

Commands read and write your local Anycap library through the bundled MCP helper. The
extension has no analytics and sends no capture text to an extension server. Link lists
request favicons from Google's favicon service using the source domain. Saving a link
can cause Anycap to fetch its metadata or use the intelligence providers you enabled
in Anycap's settings.
Preview copies are cached in this extension's local support folder, up to 40 images.
When you ask Raycast AI to use Anycap, tool inputs and responses are handled by Raycast
AI as part of that conversation.
