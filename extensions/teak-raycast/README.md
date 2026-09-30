# Teak Raycast Extension

Keyboard-first Teak workflows for capture and retrieval directly inside Raycast.

## Commands

- **Quick Save**: Open an input form to type or paste text and URLs to save.
- **Save to Teak**: Save any text or URL in one step. Accepts an optional argument and works as a [Raycast fallback command](https://manual.raycast.com/fallback-commands).
- **Save Clipboard**: Save the current clipboard contents to Teak with no prompt.
- **Save Selected Text**: Save the text currently highlighted in any app. Ideal paired with a global hotkey.
- **Save Current Browser Tab**: Save the active browser tab from Raycast. Requires the [Raycast Browser Extension](https://www.raycast.com/browser-extension).
- **Search Cards**: Find and open cards instantly by content, tags, or metadata.
- **Favorites**: Browse and open your favorited cards.
- **Browse Tags**: See every tag in your vault with per-tag card counts, then drill into a tag to search within it.

## AI Tools

Teak exposes the following tools for [Raycast AI](https://www.raycast.com/ai):

- **Save to Teak**: Save a note or URL to your Teak library.
- **Search Teak Cards**: Search cards by text, type, tags, favorite state, and sort order.
- **Get Recent Teak Cards**: Fetch the newest cards without a search query.
- **Get Teak Card**: Fetch the full details of a specific card by id.
- **List Teak Tags**: List your tags with per-tag card counts.
- **Toggle Favorite**: Favorite or unfavorite a card. Requires confirmation.

AI tools use the same sign-in as the extension — no extra setup required.

### Using an API key (optional)

Prefer an API key? Open the extension preferences and paste a key from Teak Settings > **Manage API Keys**. A configured API key takes precedence over browser sign-in, so existing setups keep working unchanged.

## Troubleshooting

- **Sign-in issues**: Use **Sign Out** from any command's action panel, then run a command again to re-authorize.
- **Invalid key errors** (API key users): regenerate the key in Teak Settings > Manage API Keys, then update extension preferences.
- **Rate limited errors**: wait briefly and retry.
- **Network errors**: verify connectivity to `app.teakvault.com` and `teakvault.com/api`.
