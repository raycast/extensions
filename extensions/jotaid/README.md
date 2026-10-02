# Jotaid

Search your [Jotaid](https://jotaid.com) notes from Raycast, and send anything you are reading
to the Inbox without leaving the app you are in.

Requires Jotaid 1.1.3 or later — a Markdown notes app for macOS with
backlinks, a knowledge graph and a co-occurrence matrix. The app does not need to be running:
saving a note launches it in the background if necessary.

**This extension works only with Jotaid.** It reads Jotaid's own library and files notes through
Jotaid's URL scheme, so it cannot be pointed at another app — if you keep your notes elsewhere,
look for that app's own extension. Two things follow from being app-specific rather than generic:
searching knows about Jotaid's structure (a note's project, its three-level hierarchy), and
captures are filed by Jotaid itself, which means they inherit its own handling — the Inbox, the
`clipping` tag, and the title its AI fills in for you.

## Commands

| Command | What it does |
| --- | --- |
| **Search Notes** | Search by title, or by title and body. `↵` opens the note in Jotaid; `⌘⇧C` copies its text, `⌘⇧L` copies a link back to it. |
| **Create Note** | A place to type, and nothing else — whatever you write goes to the Inbox. Jotaid stays in the background. |
| **Quick Capture** | Sends the text selected in whatever app you are in — or, where macOS will not hand a selection over, the clipboard — straight to the Inbox. Captures from a browser record the page's title and link, not merely the browser's name. The confirmation says which of the two it saved. Nothing comes to the front. Worth a hotkey. |

Captured notes land in the Inbox tagged `clipping`, with the source app and the time recorded
underneath, and with the title left blank so that Jotaid's own auto-fill can name them.

## Permissions

**Full Disk Access**, for **Search Notes**. It reads Jotaid's library directly, and macOS keeps
app containers behind that permission. Raycast asks the first time you run the command, or you
can grant it in **System Settings → Privacy & Security → Full Disk Access → Raycast**.

**Accessibility**, for **Quick Capture** — this is what lets Raycast read the text you have
selected in another app. Without it the command silently falls back to the clipboard, which
looks like it is ignoring your selection. Grant it in **System Settings → Privacy & Security →
Accessibility → Raycast**.

**Automation**, also for **Quick Capture**, and only when capturing from a browser: macOS asks
once per browser before Raycast may ask it which page you are on. Decline and the capture is
still saved — it just records the browser's name instead of the article.

**Create Note** needs none of them: it hands the text to Jotaid over its `jotaid://` URL scheme,
the same way the PopClip extension does.

## Privacy

The library is read **on this Mac only, and only for reading** — the extension never writes to
it, and nothing is sent anywhere. There is no analytics of any kind.

## Notes

- **Deleted notes stay hidden.** Jotaid deletes softly so that the trash and iCloud sync still
  have something to work with; this extension only ever lists notes that are actually there.
- **Which browsers give up their page.** Safari and the Chromium family — Chrome, Edge, Brave,
  Arc, Vivaldi, Opera. Firefox exposes no way to ask which tab is in front, so captures from it
  are filed under the browser's name alone.
- **Only `https:` source links are kept.** Jotaid renders the source as a clickable link in the
  footnote, and a link that cannot be opened safely is worse than no link at all.
- **Long captures are truncated** at 20 000 characters, with an ellipsis marking where.
