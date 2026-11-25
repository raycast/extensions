# easyVerein for Raycast

Search easyVerein from Raycast: pages, settings and actions, plus members, addresses,
events, invoices and more. Results open in your browser.

## Setup

1. You need board permissions in easyVerein.
2. Create an API key in easyVerein under Settings → easyVerein API.
3. Paste the key into the extension preferences.

## Usage

- Type to search pages and records, or start with a prefix like `M:` or `RECHNUNG:` to
  search one type only. The dropdown next to the search bar does the same.
- Enter opens the entry, Cmd+Enter opens the linked record, Cmd+Shift+C copies the link.
- Recently opened entries show first. Ctrl+X removes one, Ctrl+Shift+X clears the list.

## Good to know

- All pages are listed. If your role can't open one, easyVerein tells you so in the
  browser.
- Browser-only commands such as dark mode or the page tutorial aren't available here.

## Development

```
npm install
npm run dev     # uses a local easyVerein at http://localhost:8000
npm run lint
npm run build
```
