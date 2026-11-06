# Local Content Search

![Local Content Search: on-device embeddings, background indexing, Raycast extension](media/brand/readme-cover.png)

Find a file by what it contains, even when you cannot remember its name. Describe a document, photo, recording, or video in Raycast. EmbeddingGemma 2 searches the contents locally; a separate macOS service keeps the index up to date.

## Install

Requires Apple Silicon, macOS 14+, at least 8 GB RAM, and 4 GB free disk space. No Terminal, Xcode, CMake, separately installed Node, API key, or DigUp app is needed.

1. Open any Local Content Search command. First launch downloads the helper and models (about 905 MB total), verifies pinned SHA-256 checksums, and starts the background service. Keep the command open until setup finishes.
2. Open **Manage Content Index → Choose Folders and Limits** and select a small folder first. No folders are selected automatically.
3. Wait for searchable files, then run **Search File Contents** and describe what you remember.

Setup shows download progress and errors. If it stops, choose **Retry Setup**. Valid model downloads are reused. Advanced users can set **Helper Path** in extension preferences to an extracted, trusted helper release directory containing `bin/` and `licenses/`; leave it empty for verified downloads.

## Commands

| Command | What it does |
| --- | --- |
| Search File Contents | Semantic and exact-word retrieval, excerpts, page/time metadata, Quick Look, open/reveal, and copy actions |
| Manage Content Index | Select folders, inspect progress, pause/resume, set exclusions, and choose power/memory limits |
| Install Local Content Search | Download and verify the helper/models, register the service, or remove it |

Readers support text/Markdown, rich documents, PDFs including scans, images/screenshots with OCR, audio windows, and sampled video frames with audio. macOS frameworks handle decoding; no external transcription service is used.

## Background operation and safety

```text
Selected folders -> native readers -> EmbeddingGemma 2 / Metal -> SQLite
       |                                                        |
   filesystem watchers -> service queue                 Raycast search
                               ^                             |
                               +---- indexing yields -------+
```

The per-user login service runs independently of Raycast. It reconciles changed files, coalesces watcher events, and rescans periodically. SQLite retains pending work across restarts. Disconnected folders and files temporarily evicted to cloud storage retain their indexed records; deleted files in accessible folders are removed. Cloud placeholders are not downloaded to refresh their contents.

- One native worker at a time; searches interrupt indexing.
- Index workers use utility scheduling, reduced CPU priority, and at most four CPU threads. Builds use two compiler jobs.
- macOS receives a 512 MB service-host budget and a configurable native-worker budget, 2 GB by default. RSS monitoring also stops over-budget workers; timeouts and cancellation reap stuck workers.
- Low Power Mode and high memory pressure suspend indexing. A charger-only policy is available.
- Text documents above 20 MB and images above 50 MB are skipped. Audio tracks above one hour, above the 256 MB WAV scratch budget, or without a 1 GB free-space reserve are skipped with an explicit reason. Hidden directories, app bundles, credentials/key files, generated dependencies, datasets, and online-only iCloud files are excluded by default.

Resource limits reduce risk; they cannot guarantee that macOS or a driver will never crash. Exclusions also cannot identify every sensitive file. Review the folders you select.

## Privacy

Setup downloads the helper from this project's public GitHub releases and models from Hugging Face. After setup, the extension and service require no network access. They make no remote inference requests, telemetry calls, or update checks. Files, queries, extracted content, and embeddings stay on the Mac. The service accepts requests through a private Unix socket, not a TCP port.

State lives under `~/Library/Application Support/LocalSearch`. Its directory is user-private, but extracted text and vectors are not separately encrypted; use FileVault if you need disk encryption. Removing a folder hides its results immediately and prunes its records on the next indexing pass. Removing the final folder prunes records even while paused or power-blocked. Interrupted cleanup remains queued across restarts until it succeeds; the service reports cleanup failures.

## Uninstall or diagnose

Open **Install Local Content Search**, choose **Remove Background Service**, and confirm. This stops and unregisters the login service while preserving models, settings, and the index. Other commands will not reinstall it until you explicitly choose Install again. Removing the Raycast extension alone does not stop the independent service; remove the service first.

If an installed service stops, opening a command restarts it from local files without downloading again. If recovery fails, choose **Restart Background Service** to retry offline. **Repair Installation** downloads a new helper and requires a connection.

Logs are under `~/Library/Application Support/LocalSearch/logs`.

If saved configuration cannot be read, pause/resume cannot replace it with an empty folder list. Restore the configuration or explicitly choose folders; recovery preserves the original as `config.json.invalid-<timestamp>` in the state directory. The helper includes its own Node runtime, so changes to a separately installed Node do not affect the service.

## Boundaries

- Open File opens the original file; it does not seek Preview/QuickTime to a matched page or timestamp. The result displays the location.
- Code projects are skipped except screenshots. Dedicated code indexing is not enabled.
- Each fresh query starts a text-only native encoder. Repeated queries use a bounded cache; large-index latency still needs measurement.
- Folder access remains subject to macOS privacy permissions. macOS may ask you to allow access to a selected folder; setup cannot approve that prompt for you. Missing or unreadable folders do not authorize broader disk access.

## Source and licenses

The Raycast UI, Unix service, installer, resource controls, and integration tests are available in the public helper repository. The native readers, index/store/search code, and llama.cpp adapter are adapted from MIT-licensed DigUp source at `6faa29e4c315a3a591de1b41bd78751bdf39588d`. They are compiled into this project's own engine; no DigUp application or installed CLI is used.

The helper and its build source are available at [github.com/sushilk1991/raycast-local-search](https://github.com/sushilk1991/raycast-local-search). See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Installed helper licenses are retained alongside local service state.
