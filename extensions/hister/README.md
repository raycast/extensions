# Hister

Search the web pages and files indexed by your [Hister](https://hister.org) server from Raycast. Hister is a self-hosted, full-text search engine for your browsing history, written by Adam Tauber. This is an unofficial extension and is not affiliated with the Hister project.

## Setup

1. Install and start Hister. With Homebrew:

   ```sh
   brew install hister
   brew services start hister
   ```

   Then install the Hister browser extension for Chrome or Firefox so the pages you visit get indexed. `hister import browser history` adds pages you visited before installing it. The [Hister documentation](https://hister.org/docs/) covers Docker, Nix and other setups.

2. Open the extension preferences and check the Server URL. The default, `http://127.0.0.1:4433`, matches a local install. For a remote server, include any base path it is served under.

3. Leave Access Token empty unless your server requires authentication. With a single shared token, use the `app.access_token` value from your Hister config. With user accounts enabled, get your token with `hister user show USERNAME --show-token` or from the Profile page of the Hister web interface.

To try the extension without installing Hister, set the Server URL to `https://demo.hister.org`, a public read-only demo. Searching works there; pinning and recording opened results do not.

## Usage

Type a query to search your index. Hister's query language works as usual, including field filters such as `domain:` and sort directives such as `sort:-date`.

Results appear in up to three sections. Opened Before lists pages you opened from Hister for this query, with pinned pages first. Results holds the keyword matches; the detail pane shows the matching snippet with your search terms in bold. Similar Pages appears only when semantic search is enabled and lists pages that match by meaning without containing your words.

Opening a result records it in Hister's query history, the same way the Hister web interface does, so it ranks higher the next time you search for the same thing.

| Action | Shortcut |
| --- | --- |
| Open result | `↵` |
| Search the web for the query | `⌘` `↵` |
| Open the query in the Hister web interface | `⌘` `O` |
| Copy URL | `⌘` `⇧` `C` |
| Copy as Markdown link | `⌘` `⇧` `L` |
| Pin or unpin the result for this query | `⌘` `⇧` `P` |
| Remove an entry from Opened Before | `⌃` `X` |
| Show or hide the detail pane | `⌘` `⇧` `D` |

You can also enable Search History as a fallback command in Raycast's settings. Text typed in Raycast's root search is then passed straight to Hister.

## Semantic search

The Semantic Search preference only asks Hister for semantic results. Hister must have an embeddings endpoint configured for it to return any. With [Ollama](https://ollama.com), pull a model:

```sh
ollama pull nomic-embed-text
```

Then add this to your Hister config file (`hister config path` shows which file is used; create `~/.config/hister/config.yml` if it prints `(defaults)`):

```yaml
semantic_search:
  enable: true
  embedding_endpoint: 'http://localhost:11434/v1/embeddings'
  embedding_model: 'nomic-embed-text'
  dimensions: 768
  max_context_length: 512
  query_prefix: 'search_query: '
  document_prefix: 'search_document: '
```

Restart Hister, run `hister reindex` to embed the pages already in your index, and enable the Semantic Search preference. See the [semantic search configuration reference](https://hister.org/docs/configuration) for other models and providers.

## Privacy

The extension sends requests only to the Hister server you configure, and favicons are loaded from that server too. Your query goes to the Web Search URL only when you choose Search the Web.
