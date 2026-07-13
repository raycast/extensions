# T.LY URL Shortener for Raycast

Create short T.LY links from Raycast and copy them to your clipboard.

## Commands

- **Shorten URL** accepts the destination URL, optional short domain, and description as Raycast arguments.
- **Shorten Clipboard URL** shortens the URL currently on the clipboard without opening a form.

## Setup

1. Create or copy an API token from [T.LY API settings](https://t.ly/settings#/api).
2. Open Raycast preferences.
3. Find **T.LY URL Shortener** and paste the token into **T.LY API Token**.
4. Optionally set a custom short domain as the default.

The API token is stored as a Raycast password preference and is only sent to `https://api.t.ly`.

## Development

```bash
npm install
npm run lint
npm run build
```

## License

MIT
