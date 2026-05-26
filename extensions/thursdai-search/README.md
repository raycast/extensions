# ThursdAI Search

Search ThursdAI episode notes, Substack text, and transcripts directly from Raycast.

The extension uses the public Cloudflare Worker search API endpoint, but every request sends your private API key from Raycast Preferences. No API key is bundled into the extension or committed to this repo.

## Setup

1. Open Raycast Preferences.
2. Select Extensions, then ThursdAI Search.
3. Paste the website repo `SEARCH_API_KEY` into **Search API Key**.

The default API URL is:

```txt
https://thursdai.news/api/search
```

## Usage

Run **Search Episodes** and type a topic, guest, model, company, or release name.

Each result shows:

- episode title
- episode date
- focused match context
- source type
- hybrid match stats

Raycast list rows do not support inline highlighted spans, so the main list shows compact match context and the detail view shows highlighted query terms. The detail view loads the full indexed episode, puts the matched chunk first, and renders the full episode below it for scrolling.

Actions:

- **View Episode Details** opens the in-Raycast episode reader.
- **Open Episode on Substack** opens the full Substack episode when available.
- **Copy Episode Link** copies the direct episode URL.
- **Copy Markdown Link** copies a markdown-formatted link.
- **Copy Match Snippet** copies the returned snippet.

## Local Development

```sh
npm install
npm run dev
```

`npm run dev` imports the local extension into Raycast development mode.

## Verification

```sh
npm run lint
npm run build
```

## Publishing

Public Raycast Store publishing is the right path for easy installs and updates across multiple Macs. Raycast currently requires public Store publishing to be interactive because it opens a pull request against `raycast/extensions`.

1. Log in to the Raycast CLI:

```sh
npx ray login
```

2. Publish from the extension folder:

```sh
npm run publish
```

`npm run publish -- --non-interactive` is useful as a local validation check, but Raycast rejects public Store publishing in non-interactive mode. The extension still requires each Raycast install to have its own `SEARCH_API_KEY` preference after installation.

If you do not want to wait for Store review, clone this repo on another Mac and run `npm install && npm run dev` inside `raycast-thursdai-search`. Raycast will import the extension locally, but Store publishing is still the clean multi-Mac distribution path.
