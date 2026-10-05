# DevDocSearch

Download developer documentation and search saved pages offline from Raycast.

1. Open **Download Docs** and add a documentation root URL.
2. Wait for the saved page count to finish. Existing collections stay searchable if a refresh fails.
3. Open **Search Docs** to find pages by title and content. Select a result to read its saved content or open the original page.

Keyword search works without a model or API key. Semantic search is optional. It needs a compatible local MLX embedding runtime or an OpenAI-compatible or Ollama embedding endpoint, configured in **Download Docs → Embedding Settings**. Follow the [semantic setup instructions](assets/semantic-setup.md), also available from the **Build Vector Indexes** action menu in Download Docs. Setup is not run automatically. New downloads can be indexed in the background; you can pause and resume vector indexing.

When using another device or cloud provider, your saved passages and queries are sent to that endpoint. Remote backfill requires an explicit action. Keyword search remains available if indexing is paused or the embedding provider is offline.

The extension does not generate AI answers yet. The separate answer model tested during development is not included in the Store package.
