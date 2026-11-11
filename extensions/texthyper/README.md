# Texthyper for Raycast

Save pages to [Texthyper](https://texthyper.com), search your library and your highlights, and pick what to read next, without leaving the keyboard.

## Commands

| Command | What it does |
| --- | --- |
| **Save to Texthyper** | One command for every source: the URL you type, else the page in the browser you are looking at, else a link you selected or copied. Optional tags. For a browser tab the rendered page goes along with the URL (through [Raycast's browser extension](https://www.raycast.com/browser-extension)), so paywalled and logged-in pages are saved as you see them. The toast offers Open, and Undo (or Archive when the page was saved before). Also works as a fallback command: type a URL in Raycast and pick it. |
| **Search Library** | Also a fallback command: type words in Raycast and pick it. Unread, Liked, Archive, Everything, your folders and your tags, opened from cache. Typing searches the full text of everything you saved, with the matching passage in the detail pane. Archive, like, move to a folder, edit tags, copy the link, download the EPUB, delete. |
| **Search Highlights** | Every passage you highlighted and every note you wrote, across the library. Copy or paste the quote, copy it as Markdown with its source, copy the quote card image, open the original page at the quote, edit the note, change the color. |
| **Read Next** | Opens something to read. With a number ("10") it fits the minutes you have. The article you were in the middle of comes first, otherwise a random unread one. |
| **Unread in Menu Bar** | The unread count, what you were reading and what you saved last. Option-click an article to archive it. Off until you turn it on. |
| **Texthyper Account** | Sign in, see your counts, sign out. |

With Raycast AI, `@texthyper` can search and list your articles, read one, save a link and go through your highlights.

## Signing in

There is nothing to paste. The first command you run asks for your email address, Texthyper emails a six-digit code, and the code buys a token that stays in Raycast's encrypted storage. It shows as "Raycast on <your Mac>" under Settings → API tokens in Texthyper, where you can revoke it. Signing out from the Texthyper Account command revokes it too.

## Preferences

- **Open Articles**: whether Enter in Search Library opens the article in Texthyper or on the original site.
- **Server**: only for a Texthyper server of your own. Changing it signs you out, so a token never goes to another server.
- **Send the page as the browser shows it** (Save to Texthyper): turn off to send only the URL.
- **Show the unread count** (Unread in Menu Bar).
