# Changelog

## [Palette colors, faster start and fixes] - {PR_MERGE_DATE}

- Edit Card adds and removes a palette's colors, and the Update Teak Card AI tool can too
- Commands open faster while you're signed in: Raycast uses your saved sign-in without asking Teak where to sign in first
- Undo after Move to Trash puts the card back where it was, in a shuffled or oldest-first list too
- A favorite changed in a card's details saves even when you leave right away
- Signing out no longer opens Sign in with Teak again straight away
- Quick Save leaves Content empty when the clipboard holds a file, and can't save the same card twice
- Renaming a tag can change just its capitals, and a rename Teak refuses keeps what you typed
- A failed favorite or next page now says so, and save commands keep their own error message
- Tags in a card's details only filter where the list can filter by them
- Quotes of several paragraphs stay quoted in the details
- Browse Folders names its counts, like "9 smart folders"

## [Saving again, cleaner lists and fixes] - 2026-10-27

- Saving a link that's already in Teak moves that card to the top of your library, and back from Archive, instead of stopping at "Already saved"
- A type menu beside the search bar filters by Links, Text, Quotes, Images and more, in step with `type:`
- Images show a thumbnail and palettes one of their real colors in the list, other cards a colored type icon
- Every tag shows on hover behind a **+N**, and the date is when the card was last saved, matching the list's order
- Lists show a section with a card count, and Archive and Favorites no longer repeat the archived mark or star on every card
- Card actions are grouped the same way in lists and details, with Move to Trash and the account actions last
- Empty and failed lists keep Reload, Clear Filters, Leave Archive or Leave Trash, Open Teak and Sign Out
- A signed-out command opens Sign in with Teak right away
- Card details lead with the card's states and tags, and skip content that only repeats the link or the title
- Random Cards tells an empty vault apart from a finished shuffle
- Browse Tags and Browse Folders can reload after an error, and show each count once
- An untitled upload shows its file name instead of "IMAGE Card"
- Settings links and API key hints point to Teak Settings → Integrations → API keys
- New store screenshots

## [Folders, Find Similar, done states and more] - 2026-10-21

- New Browse Folders command lists your folders and smart folders and opens any of them as a card list
- Add to Folder… puts a card in a folder, and Save Search as Smart Folder… saves the current search
- New Find Similar action (⌘⇧S) and Find Similar Cards command show the cards closest in meaning to one card; paste its ID or a Teak link
- Archive Card and Unarchive (⌘⇧A), with an Archive filter and the `is:archived` qualifier
- Mark as Read, Watched, Listened, Bought, Cooked, Played or Done (⌘⇧D) on links, with a done icon in the list and Done and To Do filters
- Search understands `is:archived`, `is:done`, `is:todo`, `like:`, `mood:`, `text:`, `price:`, and `folder:`
- Sort Results can shuffle your cards
- New Random Cards command shows 20 shuffled cards to archive or keep
- Refresh Details asks Teak to read a card's page and summary again
- Card details show linked `[[` cards by title, a Linked from section, price, category, byline, published date, and where saved text came from
- Quick Save and Save to Teak take optional tags and a note
- Browse Tags can rename, merge and delete tags across your vault
- Raycast tells you how to find a card you just hid with the `secret` or `hidden` tag, and when hidden cards explain an empty list
- Raycast AI can search by similar card, done state, mood, archive and folder, list your folders, and mark done, archive or file cards

## [Files, Trash, and richer cards] - 2026-10-21

- New Save Finder Selection command uploads the files selected in Finder
- Save Clipboard uploads copied files and images
- Teak detects quotes and palettes from saved text, like the web app
- Save Current Browser Tab says when a page is already saved
- Search loads more results as you scroll and understands `trash`, `hue:`, `style:`, `#hex`, `after:`, and `before:`
- Card details show palette colors, transcripts, file names, and link facts, with Open File and Copy Color actions
- Move to Trash offers Undo, and Trash has Restore and Delete Forever
- Edit Card rewrites text and quote cards and removes tags Teak added
- New Update Teak Card AI tool adds or removes tags and changes notes

## [Shared Teak sign-in] - 2026-10-21

- Sign-in, token renewal, and Sign Out now use the same Teak sign-in library as the CLI and browser extension

## [Reliable account connections] - 2026-10-08

- Sign-in follows Teak’s current authentication provider automatically.
- Account connections recover after authentication changes.
- Keep Sign Out available when saved credentials cannot refresh or reconnect.
- Uncertain sign-in responses keep saved credentials without reopening browser sign-in.
- Confirmed WorkOS disconnect signs out Raycast across installations; reconnect can take about five minutes.
- Sign Out explains when only this Mac was signed out and preserves credentials on uncertain failures.

## [Reliable search and favorites] - 2026-09-16

- Search, favorites, and AI tools now use Teak's current card listing API
- Fixed search and favorites against the latest Teak backend

## [Sign in with your browser] - 2026-07-03

- Sign in with your browser in one step — copying an API key is no longer required to get started
- Existing API keys keep working as before
- AI tools and background save commands no longer pop open a browser sign-in window unexpectedly

## 1.0.30 - 2026-05-06

- Add **Save to Teak** fallback command so you can capture text or URLs from Raycast root search
- Add **Save Selected Text** command to send the currently highlighted text from any app to Teak
- Add **Browse Tags** command to list every tag with per-tag card counts and drill into cards by tag
- Add AI tools: **Get Recent Teak Cards**, **List Teak Tags**, and **Toggle Favorite**

## 0.2.0 - 2026-03-09

- Update design for single card details page
- Update API Endpoint
- Add **Save Clipboard** command: saves the current clipboard contents to Teak in one step without opening a form
- Add **Save Current Browser Tab** command: saves the active browser tab via the Raycast Browser Extension
- Add **AI Tools**: exposes three tools for Raycast AI — **Save to Teak**, **Search Teak Cards**, and **Get Teak Card** — reusing the same API key, no extra configuration needed

## 0.1.0 - 2026-02-23

- Initial Raycast extension release with `Quick Save`, `Search Cards`, and `Favorites`.
