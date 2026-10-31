# Rerout

Create branded short links, browse them and manage tags without leaving Raycast. Powered by [Rerout](https://rerout.co).

## Commands

- **Create Short Link**: paste a destination, optionally choose a custom domain and path, and the short URL is copied to your clipboard.
- **My Links**: search your links, copy a short URL, open the destination or its QR code, or delete a link.
- **Manage Tags**: see tags with link counts, create new tags and delete old ones.

## Setup

1. Sign in at [app.rerout.co](https://app.rerout.co/dashboard/keys).
2. Open **API keys** and create a key. Production keys start with `rrk_`; sandbox keys start with `rrk_test_`.
3. Run any Rerout command and paste the key into **API Key**.

Leave **API Base URL** at its default unless you use a staging or self-hosted Rerout deployment.

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```
