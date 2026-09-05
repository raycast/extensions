# CeyPay for Raycast

Search the [CeyPay](https://ceypay.io) documentation, REST API reference, blog, and changelog without leaving
your keyboard.

CeyPay lets Sri Lankan merchants accept cryptocurrency and settle in Rupees. This extension puts the integration
docs, the full API surface, and the latest product news one keystroke away.

## Commands

### Search Docs

Fuzzy-search every guide, integration page, and reference page. Filter by section with the dropdown. Press `↵`
to read a page inside Raycast, or `⌘ ↵` to open it in the browser.

### Search API Endpoints

Browse all CeyPay REST endpoints, grouped by resource. Each endpoint shows its parameters, request body, and
response examples in the detail pane — no browser round-trip. Search by endpoint name, path fragment, or
operation id.

| Shortcut | Action |
| --- | --- |
| `↵` | Open the endpoint's documentation |
| `⌘ ⇧ P` | Copy the path |
| `⌘ ⇧ U` | Copy the full production URL |
| `⌘ D` | Toggle the detail pane |

The action panel also offers **Copy as cURL** for both the production and sandbox hosts, pre-filled with the
authentication headers the API expects.

### Search Blog

Browse posts from the CeyPay blog as a grid of cover images. Filter by tag, press `↵` to read the post inside
Raycast, or `⌘ ↵` to open it on the site.

### Changelog

Product and legal updates as one row per entry, newest first, with its release date and tags. Press `↵` for the
full entry including screenshots, or `⌘ ↵` to open its permalink on the docs site.

### Follow CeyPay

Every official CeyPay channel — Telegram, X, LinkedIn, GitHub, Instagram, Facebook, and TikTok — in one grid.

## Where the data comes from

Docs and API search run entirely offline against `assets/index.json`, which ships inside the extension. Nothing
is fetched while you type, so results are instant and search keeps working without a network connection.

Network requests happen only when you open something:

- **Reading a docs page** pulls its Markdown twin from `docs.ceypay.io`.
- **Changelog** reads the changelog pages from `docs.ceypay.io` and splits them into entries.
- **Search Blog** reads published posts from the Ghost Content API. The key is read-only and public by design;
  posts are linked to the public frontend at `ceypay.io/blog`, never the private Ghost domain.

Both docs sources are MDX rather than plain Markdown, so `src/lib/mintlify.ts` converts the components Raycast
cannot render — cards, accordions, steps, callouts, HTML tables — into Markdown it can.

### How the index is built

The index is generated from the docs repository rather than scraped from the live site:

- `docs.json` supplies the navigation, so each page lands in the right section and group.
- Each `.mdx` file supplies its title and description from frontmatter.
- `api/v1/openapi.json` supplies every endpoint, and each operation's `x-mint.href` supplies its canonical
  documentation URL.

### Regenerating

```sh
npm run build:index                          # expects the docs repo as a sibling directory
DOCS_DIR=/path/to/ceypay-docs npm run build:index
npm run build:index -- --no-verify           # skip the live-URL check
```

By default the script verifies every indexed URL against the live site and reports any that are not reachable
yet. A batch of 404s means the deployed docs are behind the docs repo — deploy, then re-run.

`npm run build` regenerates the index before building the extension, so a release always ships a fresh index.

## Development

```sh
npm install
npm run dev
```

## Contributing

The index is derived data. To fix a wrong title or description, change it in the docs repository and
regenerate — do not hand-edit `assets/index.json`.
