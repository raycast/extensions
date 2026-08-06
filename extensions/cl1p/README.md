# cl1p.net

A Raycast extension that saves text to [cl1p.net](https://cl1p.net) and copies the resulting URL to your clipboard.

## What it does

Run **Save to cl1p.net** (search for `cl1p`, `clip`, or `save`), fill in a title and the (multi-line) content you want to share in the form, and submit. The extension:

1. Sends the content to `https://cl1p.net/<title>` via the cl1p.net API
2. Copies `https://cl1p.net/<title>` to your system clipboard
3. Shows a success or failure notification

If the title is already in use, cl1p.net refuses the write and the extension shows an error toast — pick a different title and try again.

## Setup

This extension needs a cl1p.net API access token:

1. Create a free account at [cl1p.net](https://cl1p.net) (Sign In → Sign Up)
2. Go to your account **Preferences** and generate an **API access token**
3. In Raycast, open this extension's preferences and paste the token into **API Token**

Free accounts get 1 API token and up to 20 writes per day. Note that by default, anyone who opens a saved cl1p is deleted immediately after being read (unless you have a Pro account with retention settings).

## Development

```bash
npm install
npm run dev     # loads the extension into Raycast for local testing
npm run lint    # ray lint
npm run build   # ray build
```

## License

MIT
