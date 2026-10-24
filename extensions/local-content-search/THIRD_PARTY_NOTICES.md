# Third-party notices

## DigUp

Native extraction, indexing, SQLite search, and inference adapters are adapted from [ARahim3/DigUp](https://github.com/ARahim3/DigUp), commit `6faa29e4c315a3a591de1b41bd78751bdf39588d`.

The upstream MIT license and copyright remain in [LICENSE-DigUp](https://github.com/sushilk1991/raycast-local-search/blob/main/native/LICENSE-DigUp). The fork omits the DigUp app, Sparkle updater, and app UI. Changes include independent data directories, local-only inference selection, bounded CPU use, credential exclusions for documents, whole-file size limits, and macOS real-path reconciliation fixes.

## llama.cpp and ggml

[ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) is compiled at `b11461` with the inherited no-logits patch. MIT license: [LICENSE-llama.cpp](https://github.com/sushilk1991/raycast-local-search/blob/main/native/LICENSE-llama.cpp).

Bundled upstream components include stb_image (public domain or MIT), subprocess.h by Neil Henning (Unlicense), and SHA-256 code by Igor Pavlov (public domain). See the pinned llama.cpp source for component notices.

## EmbeddingGemma 2

The local model is Google DeepMind's EmbeddingGemma 2, using the Q8_0 conversion from [`ggml-org/embeddinggemma-2-GGUF`](https://huggingface.co/ggml-org/embeddinggemma-2-GGUF), revision `bfcd298762cc34d0357ece5ebdd31791a3a374d8`.

The pinned conversion's model card declares Apache-2.0. License text: [LICENSE-EmbeddingGemma2](https://github.com/sushilk1991/raycast-local-search/blob/main/native/LICENSE-EmbeddingGemma2). Weight files are downloaded separately and are not committed to this repository. Model filenames, sizes, and SHA-256 hashes remain pinned in `service/artifacts.ts`.

## Node.js

The helper includes the official Node.js v22.22.2 macOS arm64 runtime. Its MIT license and bundled third-party notices are installed as `licenses/LICENSE-Node` beside the service state. The release builder verifies the official archive against its pinned SHA-256 before packaging.

## Raycast and JavaScript packages

Raycast API, React, and development-tool dependencies retain their package licenses in `node_modules`. See `package-lock.json` for exact versions.

## Artwork

`media/brand/icon-master.png` and `media/brand/readme-cover.png` were generated through `yoyo imagegen`. `assets/icon.png` is a 512-pixel resize of the generated icon. No Google, Raycast, or DigUp logo is used, and no affiliation is implied.
