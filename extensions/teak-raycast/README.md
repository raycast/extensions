# Teak Raycast Extension

Keyboard-first Teak workflows for capture and retrieval directly inside Raycast.

## Sign in

Run **Search Cards**. Raycast asks you to **Sign in with Teak**; finish sign-in in your browser, then return to Raycast. If Teak changes its sign-in provider, connect again when prompted.

## Commands

- **Quick Save**: Open an input form to type or paste text and URLs to save, with optional tags and a note.
- **Save to Teak**: Save any text or URL in one step, with optional tags and a note. Accepts optional arguments and works as a [Raycast fallback command](https://manual.raycast.com/fallback-commands).
- **Save Clipboard**: Save the current clipboard contents to Teak with no prompt.
- **Save Selected Text**: Save the text currently highlighted in any app. Ideal paired with a global hotkey.
- **Save Current Browser Tab**: Save the active browser tab from Raycast. Requires the [Raycast Browser Extension](https://www.raycast.com/browser-extension).
- **Search Cards**: Find and open cards instantly by content, tags, or metadata, and pick a type from the menu beside the search bar. Card actions archive, mark done, add to a folder, find similar cards, and refresh details.
- **Favorites**: Browse and open your favorited cards.
- **Browse Folders**: Open your folders and smart folders as a card list.
- **Browse Tags**: See every tag in your vault with per-tag card counts, drill into a tag to search within it, or rename, merge, and delete it.
- **Random Cards**: See 20 shuffled cards and archive the ones you're done with, or keep them.
- **Find Similar Cards**: Paste a card ID or Teak link to see the cards closest in meaning.

## Search filters

Type these into **Search Cards**, or pick them from a card's **Filters** actions: `type:`, `tag:`, `fav`, `trash`, `is:archived`, `is:done`, `is:todo`, `folder:"Reading list"`, `like:<card ID or link>`, `mood:"moody"`, `text:"total due"`, `price:<100`, `hue:`, `style:`, `#hex`, `after:`, `before:`, and `sort:oldest` or `sort:shuffle`. Cards tagged `secret` or `hidden` stay out of lists until you search `#secret` or `#hidden`.

## AI Tools

Teak exposes the following tools for [Raycast AI](https://www.raycast.com/ai):

- **Save to Teak**: Save a note or URL to your Teak library.
- **Search Teak Cards**: Search cards by text, type, tags, folder, favorite state, done state, archive, mood, similarity to a card, and sort order (including shuffle).
- **Get Recent Teak Cards**: Fetch the newest cards without a search query.
- **Get Teak Card**: Fetch the full details of a specific card by id.
- **List Teak Tags**: List your tags with per-tag card counts.
- **List Teak Folders**: List your folders and smart folders.
- **Toggle Favorite**: Favorite or unfavorite a card. Requires confirmation.
- **Update Teak Card**: Add or remove tags, change notes, mark a link done, archive a card, or add it to a folder. Requires confirmation.

AI tools use the same sign-in as the extension — no extra setup required.

### Using an API key (optional)

Prefer an API key? Open the extension preferences and paste a key from **Teak Settings → Integrations → API keys**. A configured API key takes precedence over browser sign-in.

## Troubleshooting

- **Connection unavailable**: Check your connection and choose **Retry Connection**. Your saved sign-in stays available, including when a sign-in response cannot be read.
- **Sign-in issues**: Open **Search Cards**, use **Sign Out** (⌘⇧X), then sign in again. If sign-out fails, your credentials stay saved so you can retry.
- **Invalid key errors**: Update the API key in extension preferences using **Teak Settings → Integrations → API keys**.
- **Rate limited errors**: wait briefly and retry.
- **Network errors**: verify connectivity to `app.teakvault.com` and `teakvault.com/api`.

To disconnect a connection from Teak, open **Settings → Security → Connected apps**.
With WorkOS, a confirmed disconnect signs out Raycast across all its installations. Reconnecting can take about 15 minutes. If WorkOS rejects your saved sign-in, or Teak has switched away from its provider, Raycast signs out only this Mac and tells you that other installations may remain connected. Manage those in **Settings → Security → Connected apps**.
