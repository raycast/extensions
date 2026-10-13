# Local Content Search

![Local Content Search: on-device embeddings, background indexing, Raycast extension](media/brand/readme-cover.png)

Find a file by what it contains, even when you cannot remember its name. Describe a document, photo, recording, or video in Raycast. EmbeddingGemma 2 searches the contents locally; a separate macOS service keeps the index up to date.

## Install

Requires Apple Silicon, macOS 14+, at least 8 GB RAM, Node 22.22.2+, full Xcode with Swift 6.2+, and CMake. Run these commands from the extension directory:

```sh
npm ci
npm run build:native
npm run download:models
npm run install:service
npm run dev
```

The model download is about 865 MB. The downloader pins the revision and verifies both SHA-256 checksums before installation. No Google API key or DigUp app is required.

1. Open **Manage Content Index** in Raycast.
2. Choose **Choose Folders and Limits** and select a small folder first. The included `examples/` folder is a safe test.
3. Wait for searchable files, then run **Search File Contents**. Try `restrictions on domestic animals` against the sample lease.

The extension is registered locally through Raycast's developer tooling. It has not been published to the Raycast Store.

## Commands

| Command | What it does |
| --- | --- |
| Search File Contents | Semantic and exact-word retrieval, excerpts, page/time metadata, Quick Look, open/reveal, and copy actions |
| Manage Content Index | Select folders, inspect progress, pause/resume, set exclusions, and choose power/memory limits |
| Install Local Content Search | Installation and removal instructions |

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

After setup, the extension and service require no network access. They make no remote inference requests, telemetry calls, or update checks. Files, queries, extracted content, and embeddings stay on the Mac. The service accepts requests through a private Unix socket, not a TCP port.

State lives under `~/Library/Application Support/LocalSearch`. Its directory is user-private, but extracted text and vectors are not separately encrypted; use FileVault if you need disk encryption. Removing a folder hides its results immediately and prunes its records on the next indexing pass. Removing the final folder prunes records even while paused or power-blocked. Interrupted cleanup remains queued across restarts until it succeeds; the service reports cleanup failures.

## Test

```sh
npm test && npm run lint && npm run typecheck
npm run build
npm run test:native
npm run test:e2e
npm audit
```

The end-to-end suite runs the real model and native engine against temporary synthetic files. It checks semantic retrieval, live updates, pause/resume with Raycast closed, unavailable folders, deletions, credential exclusions, PDF pages, image matches, spoken-audio matches, and video timestamps. It requires the downloaded models plus local `say` and Homebrew `ffmpeg` for fixture generation; these tools are not runtime dependencies.

Running the suite writes `docs/e2e-results.json`; see [`docs/README.md`](docs/README.md). Installed-service searches on the development Mac measured 360–572 ms for fresh queries and 3 ms for a repeated query; these are small-index measurements, not performance guarantees for a whole disk.

## Uninstall or diagnose

```sh
npm run uninstall:service
```

This stops and unregisters the login service while preserving models, settings, and the index. Disable/remove the three commands in Raycast's extension settings separately. Logs are under `~/Library/Application Support/LocalSearch/logs`.

If saved configuration cannot be read, pause/resume cannot replace it with an empty folder list. Restore the configuration or explicitly choose folders; recovery preserves the original as `config.json.invalid-<timestamp>` in the state directory. If a Node upgrade removes the binary used by the login agent, rerun `npm run install:service` with the new Node installation.

## Boundaries

- Open File opens the original file; it does not seek Preview/QuickTime to a matched page or timestamp. The result displays the location.
- Code projects are skipped except screenshots. Dedicated code indexing is not enabled.
- Each fresh query starts a text-only native encoder. Repeated queries use a bounded cache; large-index latency still needs measurement.
- Folder access remains subject to macOS privacy permissions. Missing or unreadable folders do not authorize broader disk access.

## Source and licenses

The Raycast UI, Unix service, installer, resource controls, and integration tests are implemented in this repository. The native readers, index/store/search code, and llama.cpp adapter are adapted from MIT-licensed DigUp source at `6faa29e4c315a3a591de1b41bd78751bdf39588d`. They are compiled into this project's own engine; no DigUp application or installed CLI is used.

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). The icon and cover were generated through `yoyo imagegen`, reviewed, and saved under `media/brand/`. Only the 512-pixel icon is bundled as a runtime asset.
