# Semantic File Search

Search local files by meaning using EmbeddingGemma 2. Documents, photos, video scenes and sounds are indexed on your Mac. Your files and queries are not uploaded; the project includes no telemetry.

## Requirements and setup

Apple silicon, macOS 26+, and the separately installed **Semantic Search Engine 0.7.1** are required. Allow about 2.5 GB for engine installation, plus model weights and your library index.

1. Open **Search Files** in Semantic File Search and choose **Download Search Engine** if the engine is missing.
2. Open the companion installer from the release page and click **Install**. Python and decoding libraries are included. No Homebrew or terminal setup.
3. Return to Search and choose **Check Installation**.
4. Choose **Manage Library** in Actions, download a model, select folders and apply. Model weights download from Hugging Face.

The 0.7.1 companion is unsigned; macOS may require explicit opening approval. See the [installation guide](https://github.com/nikusti/semantic-search/blob/main/docs/INSTALL.md).

MLX 8-bit and Core ML are supported; each model keeps a separate index. Text queries load only the text encoder even when searching indexed media. The default index uses 512-dimensional float32 vectors. By default, model workers unload one minute after leaving search when no indexing or request is active.

**Update Search Index** adds new/changed files and removes missing files. Add Search Folders keeps existing sources. Remove a Folder hides saved entries by default, with optional index cleanup. Folder additions preserve existing vectors; removals and exclusions can be saved during indexing. Deleting a model preserves indexes and originals. Engine data is stored in `~/Library/Application Support/Semantic Search/`.

Apple Photos is optional: enable the source in Manage Library, connect it in Actions and allow macOS access. Enable iCloud downloads to include media missing locally. Both models support photographs, video scenes and optional soundtracks. Originals stay in Photos; saved vectors and small thumbnails are retained locally. Photo results show creation dates, open in Photos and offer full-resolution **Copy Photo**. Apple controls its own Photos download cache.

Automatic updates are optional and off by default. Manage Library offers 30-minute and 1/3/6/24-hour schedules (1 hour by default), an external-power condition and pause/resume. Short Raycast checks start incremental work without waiting for a long scan. Closing the window is fine; quitting Raycast or removing its extension stops the job. Completed files are reused. No LaunchAgent is installed. Run **Activate Background Checks** after enabling updates or reinstalling.

The engine listens only on loopback, rejects browser origins, and requires an installation token for library requests. The token is stored locally with owner-only permissions. Processes able to read the token as the same user can also access the service. Audio search matches sounds, not transcripts.

Source, release notices and matching native dependency sources: [Semantic Search](https://github.com/nikusti/semantic-search).
