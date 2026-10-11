# Semantic Search

Search local files by meaning using EmbeddingGemma 2. Documents, photos, video scenes and sounds are indexed on your Mac. Your files and queries are not uploaded; the project includes no telemetry.

## Requirements and setup

Apple silicon, macOS 26+, and the separately installed **Semantic Search Engine 0.5.0** are required. Allow about 2.5 GB for engine installation, plus model weights and your library index.

1. Open Semantic Search and choose **Download Search Engine** if the engine is missing.
2. Open the companion installer from the release page and click **Install**. Python and decoding libraries are included. No Homebrew or terminal setup.
3. Return to Search and choose **Check Installation**.
4. Choose **Manage Library** in Actions, download a model, select folders and apply. Model weights download from Hugging Face.

The 0.5.0 companion is unsigned; macOS may require explicit opening approval. See the [installation guide](https://github.com/nikusti/semantic-search/blob/main/docs/INSTALL.md).

MLX 8-bit and Core ML are supported; each model keeps a separate index. Text queries load only the text encoder even when searching indexed media. The default index uses 512-dimensional float32 vectors. By default, model workers unload one minute after leaving search when no indexing or request is active.

**Update Search Index** adds new/changed files and removes missing files. Exclusions can be saved during indexing. Deleting a model preserves indexes and originals. Engine data is stored in `~/Library/Application Support/Semantic Search/`.

The engine listens only on loopback, rejects browser origins, and is accessible to other local processes. Audio search matches sounds, not transcripts.

Source, release notices and matching native dependency sources: [Semantic Search](https://github.com/nikusti/semantic-search).
