# RIRC

Search KLIPY and GIPHY for reaction GIFs and memes, then copy, paste, or save them for later. Saved media can optionally be matched semantically with Jina AI.

## Configuration

At least one media provider key is required for online search. Open the extension preferences and add any services you want to use:

- **KLIPY API Key:** Create an app in the [KLIPY Partner Panel](https://partners.klipy.com/). KLIPY is the default provider and supplies GIFs and static memes.
- **GIPHY API Key:** Create an app in the [GIPHY Developer Dashboard](https://developers.giphy.com/dashboard/). This enables GIPHY search and trending GIFs.
- **Jina AI API Key (optional):** Create a key in [Jina AI](https://jina.ai/). This creates visual embeddings when media is saved, allowing text queries to match saved media.

API keys are stored as password preferences by Raycast. Images selected for semantic indexing are sent to Jina AI; other saved media remains local.
