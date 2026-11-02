<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="TinyFish Search" width="100"/>
    <h3>TinyFish Search</h3>
    <p>Search the web, news, and research papers, and read pages from Raycast</p>
    <br/>
</div>

Search with TinyFish from Raycast on macOS and Windows. Find sources, read page content, and save useful results for later without leaving Raycast.

## Getting started

1. Open **Search Web** in Raycast.
2. Leave **TinyFish API Key** blank in the extension preferences to sign in with your TinyFish account.
3. Choose **Sign in with TinyFish**, complete sign-in in your browser, and return to Raycast.
4. Enter a query, then open a result or choose **Fetch Content** to read it in Raycast.

You can also enter a [TinyFish API key](https://agent.tinyfish.ai/api-keys) in the extension preferences. An API key takes precedence over browser sign-in. Clear it to use OAuth again.

## Commands

| Command          | What it does                                                                        |
| ---------------- | ----------------------------------------------------------------------------------- |
| Search Web       | Search web pages, news, and research papers with date and domain filters.           |
| Fetch Pages      | Read up to 10 URLs as Markdown, HTML, or JSON.                                      |
| Saved Searches   | Run pinned searches and revisit recent queries with their saved settings.           |
| Reading List     | Bookmark pages, read saved content offline, track read status, and export Markdown. |
| Read Current Tab | Fetch the active browser page through the Raycast browser extension.                |

## Searching

Choose **Web**, **News**, or **Research Papers** from the search dropdown. Open **Edit Search Filters** to narrow your query:

- Filter web and news results by recency or a custom date range.
- Filter research papers by publication year.
- Include or exclude specific domains.
- Add a **Purpose** to explain what you want to find, such as comparing pricing or researching a topic.

News results show the publisher and date when available. Research papers can include authors, venue, publication year, citation counts, and an **Open PDF** action.

Use **Load More Results** to append another page. Duplicate URLs are removed, and changing the query or filters starts a new search. Searches support up to 11 pages and stop when a page is empty or the limit is reached.

From a result, you can open the source, copy its URL or Markdown link, fetch its content, or save it to your reading list. **Copy All Results as Markdown** copies the results you have loaded.

| Action              | macOS | Windows        |
| ------------------- | ----- | -------------- |
| Edit Search Filters | `⌘⇧F` | `Ctrl+Shift+F` |
| Load More Results   | `⌘L`  | `Ctrl+L`       |

## Fetching pages

Open **Fetch Pages**, pass it a URL as a command argument, or choose **Fetch with Options** on a search result. Enter up to 10 complete HTTP or HTTPS URLs, separated by spaces or new lines. **Use Clipboard** fills the field from your clipboard.

- Choose Markdown for reading, or HTML and JSON to view and copy the source output.
- Extract page links and image URLs to browse or copy them separately.
- Enable **Fetch a fresh copy** to request new content instead of a cached result.
- Add a **Purpose** to describe the information you need. Search and fetch purposes support up to 2,000 characters.

Batch results show successful pages and failures separately. You can read or copy successful pages, copy all fetched content, and retry an individual failed URL.

### Focused extraction

Choose an **Extraction Preset** to read the full page, focus on article or main content, or remove navigation and footers. For more control, enter include and exclude CSS selectors, one per line, with up to 20 in each field.

Use **Save Extraction Preset** to reuse your selectors. Custom presets can be deleted from the action menu. If no include selector matches, the fetch reports a failure so you can adjust the selectors or explicitly fetch the full page.

## Saved searches and history

Use **Save Search** to keep a query together with its filters, purpose, country, and language. Open **Saved Searches** to run, rename, pin, or delete it. Pinned searches appear first.

The extension also keeps the most recent 100 successful searches made through the search command. You can rerun them, save them, remove individual entries, or use **Clear Search History**. Clearing history keeps saved searches intact. Turn off **Remember recent searches** in preferences to stop recording new history.

## Reading list and exports

Choose **Save to Reading List** on a search result to bookmark its URL. Choose **Save Content to Reading List** on a fetched page to keep a copy for offline reading.

In **Reading List**, you can:

- Filter pages by unread, read, or available offline.
- Read downloaded content without signing in, or use **Fetch and Save Content** on a bookmark.
- Mark pages read or unread, refresh their content, or remove them.
- Export one page with **Export Markdown**, or combine downloaded pages with **Export All Saved Content**.

Saved content keeps its output format and download time. Refreshing a page reuses its saved purpose, extraction selectors, and link settings while requesting a fresh copy. For older saved content without those settings, fetch and save it again with the options you want to keep.

Exports let you choose a folder and file name. If a file already exists, the extension adds a numbered suffix. HTML and JSON content are included in fenced code blocks inside the Markdown file.

## Reading the current browser tab

**Read Current Tab** uses the Raycast browser extension to find the active page. Connect a supported browser first. If several browser windows have active tabs, choose the page you want to read.

You can assign this command a hotkey in Raycast settings. If the browser connection is unavailable, choose **Enter URL** to continue manually. TinyFish fetches the page URL; the command does not send browser cookies or the contents of a signed-in page.

## Raycast AI and MCP

Use TinyFish Search in Raycast AI to find sources and read pages. The extension provides two tools that share the commands' OAuth or API-key authentication:

| Tool            | Capabilities                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `search`        | Web, news, and research-paper searches with purpose, domain filters, dates or publication years, region, language, and pagination. |
| `fetch_content` | Fetch up to 10 URLs with output-format selection, focused CSS extraction, extracted links, and fresh content.                      |

Example prompts:

- `@tinyfish-search Find news about solar energy from the past week.`
- `@tinyfish-search Find research papers about transformers published from 2017 through 2020 on arxiv.org.`
- `@tinyfish-search Read https://example.com and summarize it with a source link.`

The extension also registers TinyFish's remote MCP server at `https://agent.tinyfish.ai/mcp`. Its additional tools use Raycast's separate MCP connection and may request their own sign-in. The extension's declared search and fetch tools take precedence over remote tools with matching names.

## Preferences and storage

| Preference               | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| TinyFish API Key         | Optional alternative to browser sign-in.                                |
| Location                 | Optional country code for search results, such as `US`, `GB`, or `SG`.  |
| Language                 | Optional language code for search results, such as `en`, `fr`, or `de`. |
| Remember recent searches | Record recent successful searches locally. Enabled by default.          |

Saved searches, search history, extraction presets, and reading-list content are stored on this device using Raycast LocalStorage. They are not synced to TinyFish. Search and fetch requests are sent to TinyFish to retrieve results and page content.

## Development

Install dependencies and start the extension locally:

```bash
npm install
npm run dev
```

OAuth is configured with a public client in `src/auth.ts`; no client secret or environment file is needed. Avoid editing source files during browser sign-in, because a development reload invalidates the pending OAuth state. OAuth requests use TinyFish's MCP endpoint, while API-key requests use its Search and Fetch REST endpoints.

Run the project checks:

```bash
npm test
npm run build
npm run lint
npx ray evals
```

Tests require Node.js 22.18 or newer and use mocked responses. They cover request handling, search filters, pagination parameters, batch fetching, output formatting, local library storage, and exports. AI evals cover news recency, academic filters, focused extraction, source links, and partial failures.

For a manual check, search in each mode, apply filters, load more results, and fetch a page. Then save a search, download a page for offline reading, export it, and try **Read Current Tab** with a connected browser.
