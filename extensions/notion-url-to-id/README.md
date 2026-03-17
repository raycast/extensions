# Notion URL to ID

A Raycast extension to extract a Notion page or database ID from the focused browser tab or clipboard, then save recent IDs for quick reuse.

Built by Sam Dsgn.

- Homepage: https://samdsgn.studio/
- Tool page: https://samdsgn.studio/notion-id-extractor
- Source code: https://github.com/samdsgn-studio/raycast-notion-id-extractor

## Commands

### Extract Notion ID

Runs as a no-view command and uses this order:

1. Check the focused browser tab for a Notion URL.
2. If no focused Notion page is available, fall back to the clipboard.
3. Copy the normalized ID to the clipboard.
4. Save the page name, ID, source URL, and last copied timestamp into local Raycast history.

### Search Notion IDs

Opens a searchable list of copied IDs stored in Raycast local storage. Each item shows:

- page name
- Notion ID
- last copied date
- pin state

Each item exposes actions to:

- copy the Notion ID
- pin or unpin the item
- open the source Notion URL when available

## Browser Support

Focused-tab detection currently supports Arc, Google Chrome, Google Chrome Canary, Brave, Microsoft Edge, Safari, and Safari Technology Preview.
